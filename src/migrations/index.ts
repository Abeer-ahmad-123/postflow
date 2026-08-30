import * as migration_20260824_121940 from './20260824_121940';
import * as migration_20260830_000001_ready_slugs from './20260830_000001_ready_slugs';
import * as migration_20260830_000002_remove_proof_read from './20260830_000002_remove_proof_read';

export const migrations = [
  {
    up: migration_20260824_121940.up,
    down: migration_20260824_121940.down,
    name: '20260824_121940'
  },
  {
    up: migration_20260830_000001_ready_slugs.up,
    down: migration_20260830_000001_ready_slugs.down,
    name: '20260830_000001_ready_slugs'
  },
  {
    up: migration_20260830_000002_remove_proof_read.up,
    down: migration_20260830_000002_remove_proof_read.down,
    name: '20260830_000002_remove_proof_read'
  },
];
