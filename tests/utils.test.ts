import { describe, test, assert } from 'matchstick-as';
import { getCIDFromIPFSUri } from '../src/utils/helper';

describe('utils', () => {
  test('Should get cid from an IPFS link', () => {
    const uri = 'ipfs://bafyreicwfifynqtubhc5k2iiy37ozcthimwu6qfqkrgrdu5gmnvzgfdxdm';
    const expected = 'bafyreicwfifynqtubhc5k2iiy37ozcthimwu6qfqkrgrdu5gmnvzgfdxdm';

    const actual = getCIDFromIPFSUri(uri);
    assert.stringEquals(expected, actual);
  });

  test('Should get cid from an IPFS link with metadata path', () => {
    const uri = 'ipfs://bafyreicwfifynqtubhc5k2iiy37ozcthimwu6qfqkrgrdu5gmnvzgfdxdm/metadata.json';
    const expected = 'bafyreicwfifynqtubhc5k2iiy37ozcthimwu6qfqkrgrdu5gmnvzgfdxdm';

    const actual = getCIDFromIPFSUri(uri);
    assert.stringEquals(expected, actual);
  });

  test('Should get cid from an NFT Storage link', () => {
    const uri =
      'https://bafkreigl5rp3pbd52umxjw2wgcgvh5gywtvmhqkazaolad6mcqdrtpop3i.ipfs.nftstorage.link/';
    const expected = 'bafkreigl5rp3pbd52umxjw2wgcgvh5gywtvmhqkazaolad6mcqdrtpop3i';

    const actual = getCIDFromIPFSUri(uri);
    assert.stringEquals(expected, actual);
  });
});
