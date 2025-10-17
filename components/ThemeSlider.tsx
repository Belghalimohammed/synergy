import React from 'react';

interface SliderOption {
  name: string;
  label: string;
}

interface ThemeSliderProps {
  label: string;
  options: SliderOption[];
  value: string;
  onChange: (value: string) => void;
}

const ThemeSlider: React.FC<ThemeSliderProps> = ({ label, options, value, onChange }) => {
  const valueIndex = options.findIndex(opt => opt.name === value);
  const currentLabel = options[valueIndex]?.label || '';

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newIndex = parseInt(e.target.value, 10);
    onChange(options[newIndex].name);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-semibold text-[var(--text-secondary)]">{label}</h3>
        <span className="text-sm text-[var(--text-primary)] bg-[var(--bg-tertiary)] px-2 py-0.5 rounded-md">{currentLabel}</span>
      </div>
      <input
        type="range"
        min="0"
        max={options.length - 1}
        step="1"
        value={valueIndex}
        onChange={handleSliderChange}
        className="w-full h-2 bg-[var(--bg-tertiary)] rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:dark:bg-[var(--bg-quaternary)] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:ring-2 [&::-webkit-slider-thumb]:ring-[var(--color-primary-500)]"
      />
    </div>
  );
};

export default ThemeSlider;