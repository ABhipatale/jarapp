<?php

use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Exceptions\ThrottleRequestsException;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        // Behind Vercel's proxy: use the real client IP (login throttling) and https scheme.
        $middleware->trustProxies(at: '*');
    })
    ->withExceptions(function (Exceptions $exceptions) {
        // The app only ever shows short, friendly messages — never PHP/Laravel internals.
        $exceptions->render(function (Throwable $e, Request $request) {
            if (! $request->is('api/*')) {
                return null;
            }

            if ($e instanceof ValidationException) {
                $errors = $e->errors();

                return response()->json([
                    'message' => collect($errors)->flatten()->first() ?: 'Please check the form.',
                    'errors' => $errors,
                ], 422);
            }
            if ($e instanceof AuthenticationException) {
                return response()->json(['message' => 'Please login again.'], 401);
            }
            if ($e instanceof ModelNotFoundException || $e instanceof NotFoundHttpException) {
                return response()->json(['message' => 'Record not found.'], 404);
            }
            if ($e instanceof ThrottleRequestsException) {
                return response()->json(['message' => 'Too many attempts. Please wait a minute and try again.'], 429);
            }
            if ($e instanceof HttpExceptionInterface && $e->getStatusCode() < 500) {
                return response()->json(['message' => 'Something went wrong. Please try again.'], $e->getStatusCode());
            }

            // Already logged by Laravel's reporter.
            return response()->json(['message' => 'Something went wrong. Please try again.'], 500);
        });
    })->create();
