<?php

// Read through config() so values still work after `php artisan config:cache`.
return [
    'admin' => [
        'name' => env('ADMIN_NAME', 'Shop Owner'),
        'email' => env('ADMIN_EMAIL', 'admin@saiwater.in'),
        'mobile' => env('ADMIN_MOBILE'),
        'password' => env('ADMIN_PASSWORD', 'ChangeMe@123'),
    ],

];
