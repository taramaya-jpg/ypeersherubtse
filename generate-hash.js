const bcrypt = require('bcryptjs');

const plainPassword = 'YPeerAdmin2025#';

bcrypt.hash(plainPassword, 10).then(hash => {
  console.log('New bcrypt hash:', hash);
});
