<?php

namespace App\Http\Requests;

use Illuminate\Validation\Rule;

class JarTransactionRequest extends ApiRequest
{
    public function rules(): array
    {
        return [
            'customer_id' => ['required', 'integer', Rule::exists('customers', 'id')->whereNull('deleted_at')],
            'transaction_date' => ['required', 'date_format:Y-m-d', 'before_or_equal:today'],
            'transaction_type' => ['required', 'in:given,returned'],
            'jar_quantity' => ['required', 'integer', 'min:1', 'max:10000'],
            'payment_type' => ['nullable', 'in:cash,udhari'],
            'rate' => ['nullable', 'numeric', 'min:0', 'max:100000'],
            'paid_amount' => ['nullable', 'numeric', 'min:0', 'max:10000000'],
            'advance_amount' => ['nullable', 'numeric', 'min:0', 'max:10000000'],
            'notes' => ['nullable', 'string', 'max:500'],
            'client_uuid' => ['nullable', 'uuid'],
        ];
    }

    public function messages(): array
    {
        return [
            'customer_id.required' => 'Please select a customer.',
            'customer_id.exists' => 'Please select a valid customer.',
            'transaction_date.required' => 'Please select date.',
            'transaction_date.before_or_equal' => 'Date cannot be in the future.',
            'transaction_type.required' => 'Please choose Give Jar or Return Jar.',
            'transaction_type.in' => 'Invalid transaction type.',
            'jar_quantity.required' => 'Please enter jar quantity.',
            'jar_quantity.integer' => 'Jar quantity must be a whole number.',
            'jar_quantity.min' => 'Jar quantity must be at least 1.',
            'payment_type.in' => 'Invalid payment type.',
            'rate.min' => 'Rate cannot be negative.',
            'paid_amount.min' => 'Paid amount cannot be negative.',
            'advance_amount.min' => 'Advance amount cannot be negative.',
        ];
    }
}
