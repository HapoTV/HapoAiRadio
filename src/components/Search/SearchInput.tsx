import React, { useState, useEffect, useRef } from 'react';
import { useDebounce } from 'use-debounce';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useCombobox } from 'downshift';
import { useFloating, autoUpdate, offset, flip, shift } from '@floating-ui/react';
import { motion, AnimatePresence } from 'framer-motion';
import type { SearchResult } from '../../types/search';
import { searchItems } from '../../utils/search';

interface Props {
  onSearch: (query: string) => void;
  onResultSelect?: (result: SearchResult) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

export default function SearchInput({
  onSearch,
  onResultSelect,
  placeholder = 'Search...',
  className = '',
  autoFocus = false,
}: Props) {
  const [inputValue, setInputValue] = useState('');
  const [debouncedValue] = useDebounce(inputValue, 300);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { refs, floatingStyles } = useFloating({
    whileElementsMounted: autoUpdate,
    middleware: [offset(4), flip(), shift()],
  });

  const {
    isOpen,
    getInputProps,
    getItemProps,
    getMenuProps,
    highlightedIndex,
  } = useCombobox({
    items: results,
    inputValue,
    onInputValueChange: ({ inputValue: newValue }) => {
      setInputValue(newValue || '');
    },
    onSelectedItemChange: ({ selectedItem }) => {
      if (selectedItem && onResultSelect) {
        onResultSelect(selectedItem);
      }
    },
    itemToString: (item) => item?.title || '',
  });

  useEffect(() => {
    const fetchResults = async () => {
      if (!debouncedValue.trim()) {
        setResults([]);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const searchResults = await searchItems(debouncedValue);
        setResults(searchResults);
        onSearch(debouncedValue);
      } catch (err) {
        console.error('Search error:', err);
        setError('Failed to fetch search results');
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchResults();
  }, [debouncedValue, onSearch]);

  const clearSearch = () => {
    setInputValue('');
    setResults([]);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <MagnifyingGlassIcon 
          className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 transition-colors
            ${isLoading ? 'text-primary-500' : 'text-primary-400'}`}
        />
        <input
          {...getInputProps({
            ref: inputRef,
            placeholder,
            className: `
              w-full pl-10 pr-10 py-2 bg-primary-700 border border-primary-600 
              rounded-lg text-primary-50 placeholder-primary-400 
              focus:outline-none focus:ring-2 focus:ring-primary-500
              transition-all duration-200
              ${isLoading ? 'pr-24' : ''}
            `,
            autoFocus,
          })}
        />
        <AnimatePresence>
          {inputValue && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={clearSearch}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 
                rounded-full hover:bg-primary-600 text-primary-400 hover:text-primary-300
                focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <XMarkIcon className="h-4 w-4" />
            </motion.button>
          )}
        </AnimatePresence>
        {isLoading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <motion.div
              className="h-4 w-4 border-2 border-primary-500 rounded-full border-t-transparent"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
          </div>
        )}
      </div>

      <div
        {...getMenuProps({
          ref: refs.setFloating,
        })}
        style={floatingStyles}
        className={`
          absolute z-50 w-full mt-1 bg-primary-800 border border-primary-700 
          rounded-lg shadow-lg overflow-hidden transition-all duration-200
          ${isOpen && results.length > 0 ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}
        `}
      >
        {isOpen && (
          <div className="max-h-96 overflow-y-auto">
            {error ? (
              <div className="p-4 text-status-error text-sm">{error}</div>
            ) : results.length > 0 ? (
              results.map((result, index) => (
                <div
                  key={result.id}
                  {...getItemProps({ item: result, index })}
                  className={`
                    p-3 cursor-pointer transition-colors
                    ${highlightedIndex === index ? 'bg-primary-700' : 'hover:bg-primary-700'}
                  `}
                >
                  <div className="flex items-center">
                    {result.icon && (
                      <result.icon className="h-5 w-5 text-primary-400 mr-3" />
                    )}
                    <div>
                      <p className="text-primary-50 font-medium">{result.title}</p>
                      {result.subtitle && (
                        <p className="text-sm text-primary-400">{result.subtitle}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : inputValue.trim() ? (
              <div className="p-4 text-primary-400 text-sm text-center">
                No results found for "{inputValue}"
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}