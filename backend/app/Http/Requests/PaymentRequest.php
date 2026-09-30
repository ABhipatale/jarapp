<?php

namespace App\Http\Requests;

use Illuminate\Validation\Rule;

class PaymentRequest extends ApiRequest
{
    public function rules(): array
    {
        return [
            'customer_id' => ['required', 'integer', Rule::exists('customers', 'id')->whereNull('deleted_at')],
            'payment_date' => ['required', 'date_format:Y-m-d', 'before_or_equal:today'],
            'amount' => ['required', 'numeric', 'gt:0', 'max:10000000'],
            'payment_mode' => ['required', 'in:cash,upi,bank'],
            'is_advance' => ['nullable', 'boolean'],
            'notes' => ['nullable', 'string', 'max:500'],
            'client_uuid' => ['nullable', 'uuid'],
        ];
    }

    public function messages(): array
    {
        return [
            'customer_id.required' => 'Please select a customer.',
            'customer_id.exists' => 'Please select a valid customer.',
            'payment_date.before_or_equal' => 'Date cannot be in the future.',
            'amount.required' => 'Please enter paid amount.',
            'amount.numeric' => 'Please enter a valid amount.',
            'amount.gt' => 'Payment amount must be more than zero.',
            'payment_mode.required' => 'Please choose payment mode.',
            'payment_mode.in' => 'Invalid payment mode.',
        ];
    }
}
