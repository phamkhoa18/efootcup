const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

function processFile(filePath) {
  if (!filePath.endsWith('.ts') && !filePath.endsWith('.tsx')) return;
  const original = fs.readFileSync(filePath, 'utf8');
  let text = original;

  // Pattern 1: if (!isOwner) return apiError...
  // Replace with: if (!isOwner && authResult.user.role !== "admin") return apiError...
  text = text.replace(/if \(!isOwner\)/g, 'if (!isOwner && authResult?.user?.role !== "admin")');
  
  // Pattern 2: if (tournament.createdBy.toString() !== authResult.user._id) return apiError...
  // Replace with: if (tournament.createdBy.toString() !== authResult.user._id && authResult?.user?.role !== "admin")
  text = text.replace(/if\s*\([^\{]*createdBy(\?)?\.toString\(\)\s*!==\s*authResult\.user\._id\s*\)/g, 
    match => {
      // Check if it already has role check
      if (match.includes("role") || match.includes("admin")) return match;
      return match.replace(/\)$/, ' && authResult?.user?.role !== "admin")');
    });

  // Pattern 3: if (!isOwner && !isCollaborator)
  text = text.replace(/if\s*\(!isOwner\s*&&\s*!isCollaborator\)/g, 
    'if (!isOwner && !isCollaborator && authResult?.user?.role !== "admin")');

  // Pattern 4: if (!isOwner && !isSelf) (for collaborators)
  text = text.replace(/if\s*\(!isOwner\s*&&\s*!isSelf\)/g, 
    'if (!isOwner && !isSelf && authResult?.user?.role !== "admin")');

  if (original !== text) {
    fs.writeFileSync(filePath, text, 'utf8');
    console.log("Patched API File:", filePath);
  }
}

// 1. Patch API routes
walkDir('./app/api/tournaments', processFile);

// 2. We also need to patch frontend /manager/giai-dau/[id]/layout.tsx because maybe layout blocks it!
function patchLayout() {
  const layoutPath = './app/(manager)/manager/giai-dau/[id]/layout.tsx';
  if (fs.existsSync(layoutPath)) {
    let text = fs.readFileSync(layoutPath, 'utf8');
    // search for createdBy validation or user restriction
    console.log("Found layout.tsx, checking auth logic...");
    if (text.includes("tournament.createdBy?.toString() !== session?.user?.id") && !text.includes("role === 'admin'")) {
      text = text.replace(/if\s*\([^\{]*createdBy\?\.[^\)]*\s*!==\s*session\?\.user\?\.id\)/,
        match => match.replace(/\)$/, " && session?.user?.role !== 'admin')")
      );
      fs.writeFileSync(layoutPath, text, 'utf8');
      console.log("Patched layout");
    }
  }
}
patchLayout();
