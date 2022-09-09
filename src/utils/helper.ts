
import { BigInt, Address } from '@graphprotocol/graph-ts';

const metadataPart = '/metadata.json';

export function getTokenID(tokenId: BigInt, address: Address): string {
    return address
        .toHexString()
        .concat(':')
        .concat(tokenId.toString());
}

export function getSpecID(uri: string): string {
    return uri.substring(uri.lastIndexOf('/') + 1);
}

export function getMetadataUri(uri: string): string {
    return uri.concat(metadataPart);
}