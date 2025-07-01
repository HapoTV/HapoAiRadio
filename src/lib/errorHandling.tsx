import toast from 'react-hot-toast';

// Error types
export enum ErrorType {
  NETWORK = 'network',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  VALIDATION = 'validation',
  NOT_FOUND = 'not_found',
  SERVER = 'server',
  UNKNOWN = 'unknown'
}

// Error interface
export interface AppError {
  type: ErrorType;
  message: string;
  originalError?: any;
  context?: Record<string, any>;
}

// Function to create a standardized error
export function createError(
  type: ErrorType,
  message: string,
  originalError?: any,
  context?: Record<string, any>
): AppError {
  return {
    type,
    message,
    originalError,
    context
  };
}

// Function to handle errors
export function handleError(error: any): AppError {
  console.error('Error occurred:', error);
  
  // Default error
  let appError: AppError = {
    type: ErrorType.UNKNOWN,
    message: 'An unexpected error occurred. Please try again.'
  };
  
  // Handle Supabase errors
  if (error?.error_description || error?.message) {
    const errorMessage = error.error_description || error.message;
    
    if (errorMessage.includes('JWT')) {
      appError = {
        type: ErrorType.AUTHENTICATION,
        message: 'Your session has expired. Please sign in again.',
        originalError: error
      };
    } else if (errorMessage.includes('permission') || errorMessage.includes('not authorized')) {
      appError = {
        type: ErrorType.AUTHORIZATION,
        message: 'You do not have permission to perform this action.',
        originalError: error
      };
    } else if (error.code === '23505') {
      appError = {
        type: ErrorType.VALIDATION,
        message: 'This record already exists.',
        originalError: error
      };
    } else if (error.code === '23503') {
      appError = {
        type: ErrorType.VALIDATION,
        message: 'This operation would violate database constraints.',
        originalError: error
      };
    } else if (error.status === 404 || errorMessage.includes('not found')) {
      appError = {
        type: ErrorType.NOT_FOUND,
        message: 'The requested resource was not found.',
        originalError: error
      };
    } else if (error.status >= 500) {
      appError = {
        type: ErrorType.SERVER,
        message: 'A server error occurred. Please try again later.',
        originalError: error
      };
    }
  }
  
  // Handle network errors
  if (error instanceof TypeError && error.message.includes('network')) {
    appError = {
      type: ErrorType.NETWORK,
      message: 'Network error. Please check your connection and try again.',
      originalError: error
    };
  }
  
  // Handle validation errors
  if (error?.errors && Array.isArray(error.errors)) {
    appError = {
      type: ErrorType.VALIDATION,
      message: error.errors.map((e: any) => e.message).join('. '),
      originalError: error
    };
  }
  
  return appError;
}

// Function to display error to user
export function displayError(error: AppError): void {
  toast.error(error.message);
  
  // Log to monitoring service in production
  if (process.env.NODE_ENV === 'production') {
    // This would be replaced with actual error monitoring service
    console.error('Error logged to monitoring service:', error);
  }
}

// Function to handle errors and display to user
export function catchAndDisplayError(fn: () => Promise<any>): Promise<any> {
  return fn().catch(error => {
    const appError = handleError(error);
    displayError(appError);
    throw appError; // Re-throw for further handling if needed
  });
}

// Error boundary fallback component
export function ErrorFallback({ error, resetErrorBoundary }: { error: Error, resetErrorBoundary: () => void }) {
  return (
    <div className="p-6 bg-primary-800 rounded-lg shadow-lg">
      <h2 className="text-xl font-semibold text-primary-50 mb-4">Something went wrong</h2>
      <p className="text-primary-300 mb-4">{error.message}</p>
      <button
        onClick={resetErrorBoundary}
        className="px-4 py-2 bg-primary-600 text-primary-50 rounded-lg hover:bg-primary-500"
      >
        Try again
      </button>
    </div>
  );
}