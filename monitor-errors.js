// Error Monitoring Script
// Add this to any page to monitor for common issues

(function() {
    const errors = [];
    
    // Monitor console errors
    const originalError = console.error;
    console.error = function(...args) {
        errors.push({
            type: 'console.error',
            message: args.join(' '),
            timestamp: new Date().toISOString()
        });
        originalError.apply(console, args);
    };
    
    // Monitor image load errors
    document.addEventListener('error', function(e) {
        if (e.target.tagName === 'IMG') {
            errors.push({
                type: 'image.error',
                src: e.target.src,
                alt: e.target.alt,
                timestamp: new Date().toISOString()
            });
        }
    }, true);
    
    // Monitor fetch errors
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
        return originalFetch.apply(this, args)
            .catch(error => {
                errors.push({
                    type: 'fetch.error',
                    url: args[0],
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
                throw error;
            });
    };
    
    // Report function
    window.getErrorReport = function() {
        console.log('📊 ERROR REPORT:');
        console.log(`Total errors: ${errors.length}`);
        
        const byType = {};
        errors.forEach(error => {
            byType[error.type] = (byType[error.type] || 0) + 1;
        });
        
        console.log('By type:', byType);
        console.log('Details:', errors);
        
        return errors;
    };
    
    console.log('🔍 Error monitoring active. Run getErrorReport() to see results.');
})();
