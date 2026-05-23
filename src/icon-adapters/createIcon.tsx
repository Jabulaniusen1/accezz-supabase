import type { SVGProps } from 'react';
import { HugeiconsIcon, type IconSvgElement, type HugeiconsProps } from '@hugeicons/react';

export type CompatibleIconProps = Omit<HugeiconsProps, 'icon' | 'altIcon' | 'showAlt'> &
  SVGProps<SVGSVGElement> & {
    size?: number | string;
  };

export const createIcon = (icon: IconSvgElement) => {
  const WrappedIcon = ({ size, color, ...props }: CompatibleIconProps) => {
    return (
      <HugeiconsIcon
        icon={icon}
        size={size}
        color={color ?? 'currentColor'}
        strokeWidth={props.strokeWidth ?? 1.8}
        {...props}
      />
    );
  };

  WrappedIcon.displayName = 'HugeiconsAdapter';
  return WrappedIcon;
};
