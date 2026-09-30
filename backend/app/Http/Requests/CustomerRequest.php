<?php

namespace App\Http\Requests;

class CustomerRequest extends ApiRequest
{
    protected function prepareForValidation(): void
    {
        $this->merge([
            'name' => trim((string) $this->input('name')),
            'mobile' => $this->cleanMobile($this->input('mobile')),
        ]);
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:120'],
            'mobile' => ['required', 'regex:/^[6-9][0-9]{9}$/'],
            'address' => ['nullable', 'string', 'max:500'],
            'status' => ['nullable', 'in:active,inactive'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'Please enter customer name.',
            'name.max' => 'Customer name is too long.',
            'mobile.required' => 'Please enter mobile number.',
            'mobile.regex' => 'Please enter a valid 10-digit mobile number.',
            'status.in' => 'Invalid customer status.',
        ];
    }
}
