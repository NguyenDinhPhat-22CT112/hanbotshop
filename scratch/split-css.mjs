import fs from 'fs';
import postcss from 'postcss';
import path from 'path';

const globalsPath = path.resolve('../apps/admin/src/app/globals.css');
const appDir = path.resolve('../apps/admin/src/app');

const rules = {
  login: {
    matchers: [/^\.admin-login-/, /^\.user-account-/, /^\.user-password-/],
    path: path.join(appDir, 'login', 'login.css')
  },
  catalog: {
    matchers: [/^\.catalog-/, /^\.product-/, /^\.price-/, /^\.tag-/, /^\.image-/, /^\.uploaded-/, /^\.storage-/, /^\.publish-/, /^\.sort-/, /^\.action-/],
    path: path.join(appDir, 'catalog', 'catalog.css')
  },
  orders: {
    matchers: [/^\.order-/, /^\.user-order-/],
    path: path.join(appDir, 'orders', 'orders.css')
  },
  production: {
    matchers: [/^\.production-/],
    path: path.join(appDir, 'production', 'production.css')
  },
  categories: {
    matchers: [/^\.category-/],
    path: path.join(appDir, 'categories', 'categories.css')
  },
  'audit-logs': {
    matchers: [/^\.audit-/],
    path: path.join(appDir, 'audit-logs', 'audit-logs.css')
  },
  users: {
    matchers: [/^\.user-/, /^\.users-/, /^\.role-/, /^\.create-user-/, /^\.password-/, /^\.management-toolbar/],
    path: path.join(appDir, 'users', 'users.css')
  }
};

const cssString = fs.readFileSync(globalsPath, 'utf8');

const root = postcss.parse(cssString);

const extractedRoots = {
  login: postcss.root(),
  catalog: postcss.root(),
  orders: postcss.root(),
  production: postcss.root(),
  categories: postcss.root(),
  'audit-logs': postcss.root(),
  users: postcss.root()
};

function matchesCategory(selector, categoryName) {
  const matchers = rules[categoryName].matchers;
  return matchers.some(matcher => {
    // Check if the selector starts with or contains the matcher pattern
    return matcher.test(selector);
  });
}

function processRule(rule, rootToAppend, parentAtRule = null) {
  if (parentAtRule) {
    let existingAtRule = rootToAppend.nodes.find(n => n.type === 'atrule' && n.name === parentAtRule.name && n.params === parentAtRule.params);
    if (!existingAtRule) {
      existingAtRule = postcss.atRule({ name: parentAtRule.name, params: parentAtRule.params });
      rootToAppend.append(existingAtRule);
    }
    existingAtRule.append(rule.clone());
  } else {
    rootToAppend.append(rule.clone());
  }
}

let nodesToRemove = [];

root.walkRules(rule => {
  const selectors = rule.selectors;
  let matchedCategory = null;

  for (const selector of selectors) {
    for (const catName of Object.keys(rules)) {
      if (matchesCategory(selector, catName)) {
        matchedCategory = catName;
        break;
      }
    }
    if (matchedCategory) break;
  }

  if (matchedCategory) {
    processRule(rule, extractedRoots[matchedCategory], rule.parent.type === 'atrule' ? rule.parent : null);
    nodesToRemove.push(rule);
  }
});

// Remove extracted rules
nodesToRemove.forEach(rule => {
  const parent = rule.parent;
  rule.remove();
  if (parent && parent.type === 'atrule' && parent.nodes.length === 0) {
    parent.remove();
  }
});

// Remove empty media queries that might be left over from other manual edits or just in case
root.walkAtRules(atRule => {
  if (atRule.nodes && atRule.nodes.length === 0) {
    atRule.remove();
  }
});

fs.writeFileSync(globalsPath, root.toString());
console.log('Updated globals.css');

for (const [catName, data] of Object.entries(rules)) {
  if (extractedRoots[catName].nodes.length > 0) {
    fs.mkdirSync(path.dirname(data.path), { recursive: true });
    fs.writeFileSync(data.path, extractedRoots[catName].toString());
    console.log(`Created ${data.path}`);
  } else {
    console.log(`No rules found for ${catName}`);
  }
}
