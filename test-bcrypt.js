const bcrypt = require('bcryptjs');

const plainPassword = 'YPeerAdmin2025#';
const storedHash = '$2a$10$YOP1flk/jj7nhABhC6HLUO.FfEVUzvuOaspvMSDXROgyGrwYQdbw.';

bcrypt.compare(plainPassword, storedHash).then(isMatch => {
  console.log('Password matches stored hash:', isMatch);
});

bcrypt.hash(plainPassword, 10).then(newHash => {
  console.log('New hash generated:', newHash);
  bcrypt.compare(plainPassword, newHash).then(isMatch => {
    console.log('Password matches new hash:', isMatch);
  });
});
