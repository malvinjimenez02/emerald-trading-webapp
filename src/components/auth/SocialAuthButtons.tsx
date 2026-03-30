import React from 'react';

interface SocialAuthButtonsProps {
  mode: 'login' | 'register';
}

export const SocialAuthButtons: React.FC<SocialAuthButtonsProps> = ({ mode }) => {
  const text = mode === 'login' ? 'Sign in' : 'Sign up';
  
  return (
    <div className="w-full">
      <div className="flex gap-4 w-full mb-8">
        <button 
          type="button"
          onClick={() => {}} // Pending Supabase connectivity
          className="flex-1 flex items-center justify-center gap-3 bg-[#0D1117] border border-divider hover:bg-bg-surface transition-all py-3.5 rounded-[12px]"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-[18px] h-[18px]">
            <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
            <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
            <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
            <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
          </svg>
          <span className="text-white text-[14px] font-medium">{text} with Google</span>
        </button>
        <button 
          type="button"
          onClick={() => {}} // Pending Supabase connectivity
          className="flex-1 flex items-center justify-center gap-3 bg-[#0D1117] border border-divider hover:bg-bg-surface transition-all py-3.5 rounded-[12px]"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" className="w-[18px] h-[18px] fill-white">
            <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 24 184.8 8 277.3c-1.9 5.3-21.3 73.1-2.9 152.4C19.7 495.2 38.3 512 55.4 512c14.7 0 31.1-10.7 54.3-10.7 23.6 0 38.5 11.2 55 11.2 18.2 0 34.6-13.8 54-28.7 11.8-10.9 22.9-24.3 32.3-38.3-22.3-9.5-38.9-31.5-38.6-59.5zM264.8 89.2c15.6-19.4 26.2-46.3 23.3-73.1-23.7 1-52.1 16-68.8 35.5-14.1 16.3-26.3 44.1-22.8 69.9 26.3 2 52.8-13.4 68.3-32.3z"/>
          </svg>
          <span className="text-white text-[14px] font-medium">{text} with Apple</span>
        </button>
      </div>

      <div className="flex items-center gap-4 w-full mb-8">
        <div className="flex-1 h-px bg-divider"></div>
        <span className="text-text-secondary text-[14px]">Or</span>
        <div className="flex-1 h-px bg-divider"></div>
      </div>
    </div>
  );
};
