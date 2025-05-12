import React from 'react';
import { motion } from 'framer-motion';

interface Props {
  count?: number;
  className?: string;
}

export default function LoadingSkeleton({ count = 1, className = '' }: Props) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={`bg-primary-800 rounded-lg animate-pulse ${className}`}
        />
      ))}
    </>
  );
}