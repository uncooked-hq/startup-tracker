import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="py-12 border-t border-white/5 mt-20 bg-black text-center">
      <div className="flex flex-col items-center justify-center gap-4">
        <p className="text-neutral-600 text-sm">
          &copy; {new Date().getFullYear()} uncooked. all rights reserved.
        </p>
        <div className="flex gap-6 text-sm text-neutral-500">
           <a href="#" className="hover:text-brand transition-colors">twitter</a>
           <a href="#" className="hover:text-brand transition-colors">instagram</a>
           <a href="#" className="hover:text-brand transition-colors">manifesto</a>
        </div>
      </div>
    </footer>
  );
};