import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="py-12 border-t border-white/5 mt-20 bg-black text-center">
      <div className="flex flex-col items-center justify-center gap-4">
        <p className="text-neutral-600 text-sm">
          &copy; {new Date().getFullYear()} uncooked. all rights reserved.
        </p>
        <div className="flex gap-6 text-sm text-neutral-500">
           <a
             href="https://www.linkedin.com/company/uncookedjobs"
             target="_blank"
             rel="noopener noreferrer"
             className="hover:text-brand transition-colors"
           >
             linkedin
           </a>
           <a
             href="https://www.instagram.com/uncookedjobs"
             target="_blank"
             rel="noopener noreferrer"
             className="hover:text-brand transition-colors"
           >
             instagram
           </a>
        </div>
      </div>
    </footer>
  );
};