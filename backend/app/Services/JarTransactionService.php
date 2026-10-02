<?php

namespace App\Services;

use App\Models\Customer;
use App\Models\Jar;
use App\Models\JarTransaction;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class JarTransactionService
{
    public function __construct(
        private BalanceService $balances,
        private LedgerService $ledger,
        private JarService $jars,
    ) {}

    /**
     * Save a GIVE / RETURN entry. All money is recalculated here; the app's numbers
     * are only a preview. Returns [transaction, created(bool), balance-after].
     */
    public function create(array $data, ?int $userId): array
    {
        if (! empty($data['client_uuid']) && $existing = JarTransaction::where('client_uuid', $data['client_uuid'])->first()) {
            return [$existing, false, $this->balances->forCustomer($existing->customer_id)];
        }

        try {
            return DB::transaction(function () use ($data, $userId) {
                // Row lock: two quick saves for the same customer are applied one after another.
                Customer::whereKey($data['customer_id'])->lockForUpdate()->firstOrFail();
                $before = $this->balances->forCustomer($data['customer_id']);

                $qty = (int) $data['jar_quantity'];
                $row = [
                    'customer_id' => $data['customer_id'],
                    'transaction_date' => $data['transaction_date'],
                    'transaction_type' => $data['transaction_type'],
                    'jar_quantity' => $qty,
                    'notes' => $data['notes'] ?? null,
                    'client_uuid' => $data['client_uuid'] ?? null,
                    'created_by' => $userId,
                ];

                if ($data['transaction_type'] === JarTransaction::RETURNED) {
                    if ($qty > $before['current_jars']) {
                        throw ValidationException::withMessages([
                            'jar_quantity' => $before['current_jars'] === 0
                                ? __('या ग्राहकाकडे परत करण्यासाठी जार नाहीत.')
                                : __('ग्राहकाकडे फक्त :jars जार आहेत. :qty जार परत घेता येणार नाहीत.', ['jars' => $before['current_jars'], 'qty' => $qty]),
                        ]);
                    }
                    $row += ['payment_type' => 'cash', 'rate' => 0, 'amount' => 0, 'paid_amount' => 0, 'udhari_amount' => 0, 'advance_amount' => 0];
                } else {
                    // Can't give more jars than are in the shop. Locking the jar rows makes two
                    // simultaneous "give" entries (for different customers) wait for each other.
                    Jar::query()->lockForUpdate()->pluck('id');
                    $available = $this->jars->summary()['available_jars'];
                    if ($qty > $available) {
                        throw ValidationException::withMessages([
                            'jar_quantity' => match (true) {
                                Jar::count() === 0 => __("अजून स्टॉकमध्ये जार नाहीत. आधी 'जार' विभागात जार जोडा."),
                                $available <= 0 => __('दुकानात एकही जार उपलब्ध नाही. सर्व जार ग्राहकांकडे आहेत किंवा खराब/हरवलेले आहेत.'),
                                default => __('दुकानात फक्त :available जार उपलब्ध आहेत. :qty जार देता येणार नाहीत.', ['available' => $available, 'qty' => $qty]),
                            },
                        ]);
                    }

                    $rate = round((float) ($data['rate'] ?? 0), 2);
                    $amount = round($qty * $rate, 2);
                    $paymentType = $data['payment_type'] ?? 'cash';
                    $paid = array_key_exists('paid_amount', $data) && $data['paid_amount'] !== null
                        ? round((float) $data['paid_amount'], 2)
                        : ($paymentType === 'cash' ? $amount : 0);

                    if ($paid > $amount) {
                        throw ValidationException::withMessages([
                            'paid_amount' => __('भरलेली रक्कम बिलापेक्षा जास्त असू शकत नाही. जास्तीची रक्कम आगाऊ म्हणून टाका.'),
                        ]);
                    }

                    $row += [
                        'payment_type' => $paid >= $amount ? 'cash' : 'udhari',
                        'rate' => $rate,
                        'amount' => $amount,
                        'paid_amount' => $paid,
                        'udhari_amount' => round($amount - $paid, 2),
                        'advance_amount' => round((float) ($data['advance_amount'] ?? 0), 2),
                    ];
                }

                $tx = JarTransaction::create($row);
                $this->ledger->rebuild($tx->customer_id);

                return [$tx, true, $this->balances->forCustomer($tx->customer_id)];
            });
        } catch (UniqueConstraintViolationException $e) {
            // Same client_uuid arrived twice at the same moment (offline sync retry).
            $existing = JarTransaction::where('client_uuid', $data['client_uuid'] ?? null)->first();
            if (! $existing) {
                throw $e;
            }

            return [$existing, false, $this->balances->forCustomer($existing->customer_id)];
        }
    }

    public function delete(JarTransaction $tx): void
    {
        DB::transaction(function () use ($tx) {
            Customer::withTrashed()->whereKey($tx->customer_id)->lockForUpdate()->first();

            if ($tx->transaction_type === JarTransaction::RETURNED) {
                // Undoing a return puts the jars back with the customer — they must exist in the shop.
                Jar::query()->lockForUpdate()->pluck('id');
                $available = $this->jars->summary()['available_jars'];
                if ($tx->jar_quantity > $available) {
                    throw ValidationException::withMessages([
                        'transaction' => __('हटवता येत नाही: दुकानात फक्त :available जार आहेत, ही परत नोंद :qty जारची होती.', ['available' => $available, 'qty' => $tx->jar_quantity]),
                    ]);
                }
            }

            if ($tx->transaction_type === JarTransaction::GIVEN) {
                $jars = $this->balances->forCustomer($tx->customer_id)['current_jars'];
                if ($jars - $tx->jar_quantity < 0) {
                    throw ValidationException::withMessages([
                        'transaction' => __('हटवता येत नाही: यातील काही जार आधीच परत आले आहेत. आधी परत जारची नोंद हटवा.'),
                    ]);
                }
            }

            $tx->delete();
            $this->ledger->rebuild($tx->customer_id);
        });
    }
}
