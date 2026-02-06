import React, { useEffect } from 'react';

const Language = () => {
  useEffect(() => {
    
    window.googleTranslateElementInit = () => {
      // Only initialize if element exists and not already initialized
      const element = document.getElementById('google_translate_element');
      if (element && !element.hasChildNodes()) {
        new window.google.translate.TranslateElement(
          {
            pageLanguage: "en",
            includedLanguages: "en,fr,de,es,it,pt,hi,ja,ko,zh,ar,ru,mr",
            layout: window.google.translate.TranslateElement.InlineLayout.VERTICAL,
            
          },
          "google_translate_element"
        );
        console.log('Google Translate initialized');
      }
    };

    // Only load script if it doesn't exist
    const existingScript = document.querySelector('script[src*="translate.google.com"]');
    if (!existingScript) {
      const script = document.createElement("script");
      script.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
      script.async = true;
      document.body.appendChild(script);
    } else if (window.google && window.google.translate) {
      // Script exists, just initialize
      window.googleTranslateElementInit();
    }

    return () => {
      // Cleanup function
      if (window.googleTranslateElementInit) {
        delete window.googleTranslateElementInit;
      }
    };
  }, []);

  return (
    <div>
     
      <div id="google_translate_element" className='text-white bg-white sm:bg-transparent'></div>
     
    </div>
  );
};

export default Language;
