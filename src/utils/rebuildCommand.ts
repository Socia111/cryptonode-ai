// Execute /rebuild command utility
export function executeRebuildCommand() {
  console.log('🚀 /rebuild command executed - Starting GitHub restoration...');
  console.log('📋 Loading perfect version with all 144 Supabase functions...');
  
  // Set rebuild flag
  localStorage.setItem('rebuildCommand', 'true');
  
  // Trigger page reload to start rebuild process
  window.location.reload();
}

// Auto-execute rebuild on import if command detected
(function() {
  const urlPath = window.location.pathname;
  const urlSearch = window.location.search;
  const urlHash = window.location.hash;
  
  // Check if /rebuild was called as a command
  if (urlPath.includes('rebuild') || 
      urlSearch.includes('rebuild') || 
      urlHash.includes('rebuild') ||
      document.referrer.includes('rebuild')) {
    
    console.log('🔄 /rebuild detected - auto-executing...');
    executeRebuildCommand();
  }
})();