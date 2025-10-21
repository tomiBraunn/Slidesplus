import { useState, useRef, useEffect } from 'react';

type Props = {
  selected: string;
  setSelected: (value: string) => void;
};

function SortBy({ selected, setSelected }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const toggleDropdown = () => {
    if (!isOpen) {
      setIsOpen(true);
      setTimeout(() => setShowDropdown(true), 150);
    } else {
      setShowDropdown(false);
      setTimeout(() => setIsOpen(false), 150);
    }
  };

  const handleClick = (option: string) => setSelected(option);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
        setTimeout(() => setIsOpen(false), 150);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative flex items-center justify-center gap-1">
      <div
        onClick={toggleDropdown}
        className={`flex items-center justify-center border border-[#2B2B2B] bg-[#0f0f0f] text-white defaultStyleHover  gap-1 px-3 h-fit cursor-pointer select-none text-lg
                    transition-all duration-300 ease-out ${isOpen ? 'rounded-t-[20px] gap-9' : 'rounded-full gap-1'}`}
      >
        <p>Sort by</p>
        <span
          className={`material-symbols-outlined w-[1em] h-[2em] transition-transform duration-300 ease-out ${isOpen ? 'rotate-180' : 'rotate-0'}`}
        >
          arrow_drop_down
        </span>
      </div>
      <div
        className={`absolute left-0 top-13 z-10 text-white border border-[#2B2B2B] bg-[#0f0f0f] w-full overflow-hidden
                    transition-all duration-300 ease-out
                    ${showDropdown ? 'max-h-60 opacity-100 translate-y-0 rounded-b-xl' : 'max-h-0 opacity-0 -translate-y-5 rounded-b-none'}`}
      >
        <ul className="flex flex-col">
          {["Recent", "Creation date", "A-Z"].map((option, index, arr) => (
            <div
              key={option}
              className={`flex items-center justify-start gap-1 cursor-pointer hover:bg-[#333] ${index === arr.length - 1 && showDropdown ? 'rounded-b-xl' : ''}`}
              onClick={() => handleClick(option)}
            >
              <span
                className={`rounded-sm w-5 aspect-square ml-2 ${selected === option ? 'bg-[#3CFF52]' : 'bg-[#2B2B2B]'}`}
              ></span>
              <li className="px-1 py-2 w-full">{option}</li>
            </div>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default SortBy;
