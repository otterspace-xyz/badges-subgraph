import { SpecMetadata, RaftMetadata } from '../generated/schema';
import {
  log,
  json,
  JSONValue,
  JSONValueKind,
  Bytes,
  dataSource,
  Result,
} from '@graphprotocol/graph-ts';

export function handleSpecMetadata(content: Bytes): void {
  let context = dataSource.context();
  let cid = context.getString('ipfsHash');

  const result = json.try_fromBytes(content);
  if (result.isOk) {
    const spec = new SpecMetadata(cid);

    spec.name = getStringValueFromMetadata(result, 'name');
    spec.description = getStringValueFromMetadata(result, 'description');
    spec.image = getStringValueFromMetadata(result, 'image');

    const schema = result.value.toObject().get('schema');
    spec.schema = schema !== null ? schema.toString() : null;

    const externalUrl = result.value.toObject().get('external_url');
    spec.externalUrl = externalUrl !== null ? externalUrl.toString() : null;

    const properties = result.value.toObject().get('properties');
    spec.expiresAt = getFieldFromProperties(properties, 'expiresAt');

    spec.save();
  } else {
    log.error('handleSpecMetadata: error fetching metadata for {}', [cid]);
  }
}

function getStringValueFromMetadata(result: Result<JSONValue, boolean>, key: string): string {
  return (result.value.toObject().get(key) as JSONValue).toString();
}

function getFieldFromProperties(properties: JSONValue | null, fieldName: string): string | null {
  const value = properties !== null ? properties.toObject().get(fieldName) : null;

  return value !== null && value.kind === JSONValueKind.STRING ? value.toString() : null;
}

export function handleRaftMetadata(content: Bytes): void {
  let context = dataSource.context();
  let cid = context.getString('ipfsHash');

  const result = json.try_fromBytes(content);
  if (result.isOk) {
    const raft = new RaftMetadata(cid);

    raft.name = (result.value.toObject().get('name') as JSONValue).toString();
    raft.description = (result.value.toObject().get('description') as JSONValue).toString();
    raft.image = (result.value.toObject().get('image') as JSONValue).toString();

    raft.save();
  } else {
    log.error('handleRaftMetadata: error fetching the metadata for {}', [cid]);
  }
}
