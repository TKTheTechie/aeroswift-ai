/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{svelte,js,ts}'],
  theme: {
    extend: {
      colors: {
        // Royal Caribbean theme — deep navy base with a bright royal-blue accent.
        // Token names kept as `aero-*` so existing utility classes re-theme in place.
        'aero-teal': '#2d9cff',  // bright royal blue (primary accent)
        'aero-dark': '#00205b',  // deep navy (brand base)
        'aero-light': '#4fb0ff', // light blue
        'aero-bg': '#eaf2fb',    // very light blue (page background)
      },
      fontFamily: {
        'display': ['Poppins', 'system-ui', 'sans-serif'],
        'body': ['Inter', 'system-ui', 'sans-serif'],
      }
    }
  },
  plugins: []
};
