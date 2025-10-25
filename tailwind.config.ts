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
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			}
  		},
  		borderRadius: {
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