import React from 'react';

const Loader: React.FC = () => (
  <div className="flex items-center justify-center h-full w-full">
    <div className="w-12 h-12 rounded-full animate-spin border-4 border-solid border-sky-500 border-t-transparent"></div>
  </div>
);

export default Loader;