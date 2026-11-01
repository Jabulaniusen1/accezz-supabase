import type { Config } from "tailwindcss";
/** @type {import('tailwindcss').Config} */

const config: Config = {
   darkMode: 'class',
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
		screens: {
			'xs': '475px',
		  },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // Brand orange. Use bg-brand / text-brand / border-brand/20 etc.
        // instead of hardcoding the hex value.
        brand: {
          DEFAULT: '#f54502',
          dark: '#d63a02', // hover / pressed
        },
      },
  		borderRadius: {
  			// Every card, panel and modal: rounded-card. Boxes nested inside a card use rounded-2xl.
  			card: '1.5rem',
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		keyframes: {
			'fade-in-up': {
			  '0%': {
				opacity: '0',
				transform: 'translateY(20px)'
			  },
			  '100%': {
				opacity: '1',
				transform: 'translateY(0)'
			  },
			},
			'fade-in': {
			  '0%': {
				opacity: '0'
			  },
			  '100%': {
				opacity: '1'
			  },
			},
			fadeIn: {
				'0%': { opacity: '0' },
				'100%': { opacity: '1' },
			  },
			  slideUp: {
				'0%': { transform: 'translateY(20px)', opacity: '0' },
				'100%': { transform: 'translateY(0)', opacity: '1' },
			  },
			  tilt: {
				'0%, 50%, 100%': {
				  transform: 'rotate(0deg)',
				},
				'25%': {
				  transform: 'rotate(0.5deg)',
				},
				'75%': {
				  transform: 'rotate(-0.5deg)',
				},
			  },
			blob: {
			  "0%": {
				transform: "translate(0px, 0px) scale(1)",
			  },
			  "33%": {
				transform: "translate(30px, -50px) scale(1.1)",
			  },
			  "66%": {
				transform: "translate(-20px, 20px) scale(0.9)",
			  },
			  "100%": {
				transform: "translate(0px, 0px) scale(1)",
			  },
			},
		  },
  		animation: {
			'fade-in-up': 'fade-in-up 0.5s ease-out forwards',
			'fade-in': 'fade-in 0.5s ease-out forwards',
			blob: "blob 7s infinite",
			fadeIn: 'fadeIn 0.5s ease-in',
			slideUp: 'slideUp 0.5s ease-out',
			tilt: 'tilt 10s infinite linear',
		  },
    },
  },
  plugins: [],
};
export default config;