import React from 'react';
import { PlayIcon } from '@heroicons/react/24/outline';
import GlassmorphicCard from '../GlassmorphicCard';
import type { Interview } from '../../types';

interface Props {
  interviews: Interview[];
  onInterviewSelect: (interview: Interview) => void;
}

export default function InterviewsSection({ interviews, onInterviewSelect }: Props) {
  return (
    <section>
      <h2 className="text-2xl font-bold text-primary-50 mb-6">Watch Interviews</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {interviews.map((interview) => (
          <GlassmorphicCard 
            key={interview.id} 
            className="overflow-hidden group"
            onClick={() => onInterviewSelect(interview)}
          >
            <div className="relative">
              <img
                src={interview.image}
                alt={interview.title}
                className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-primary-900/90 via-primary-900/40 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <h3 className="text-lg font-semibold text-primary-50 mb-1">
                  {interview.title}
                </h3>
                <p className="text-sm text-primary-300 line-clamp-2">
                  {interview.description}
                </p>
                <p className="text-sm text-primary-400 mt-2">
                  Duration: {interview.duration}
                </p>
              </div>
              <button className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 p-3 rounded-full bg-primary-700/90 hover:bg-primary-600 transition-colors opacity-0 group-hover:opacity-100">
                <PlayIcon className="w-8 h-8 text-primary-50" />
              </button>
            </div>
          </GlassmorphicCard>
        ))}
      </div>
    </section>
  );
}