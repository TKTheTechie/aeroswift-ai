/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{svelte,js,ts}'],
  theme: {
    extend: {
      colors: {
        'aero-teal': '#1abc9c',
        'aero-dark': '#16a085',
        'aero-light': '#48c9b0',
        'aero-bg': '#e8f8f5',
      },
      fontFamily: {
        'display': ['Poppins', 'system-ui', 'sans-serif'],
        'body': ['Inter', 'system-ui', 'sans-serif'],
      }
    }
  },
  plugins: []
};
