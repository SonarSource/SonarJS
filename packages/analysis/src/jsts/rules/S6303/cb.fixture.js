import { Alias, Key } from 'aws-cdk-lib/aws-kms';
import { CfnDBCluster, CfnDBInstance, DatabaseCluster, DatabaseClusterFromSnapshot, DatabaseInstance, DatabaseInstanceReadReplica } from 'aws-cdk-lib/aws-rds';

function cfnDBCluster() {

  const storageEncrypted = true;

  new CfnDBCluster(this, 'encrypted', unknown);
  new CfnDBCluster(this, 'encrypted', { storageEncrypted: true });
  new CfnDBCluster(this, 'encrypted', { storageEncrypted: unknown });
  new CfnDBCluster(this, 'encrypted', { storageEncrypted });
  new CfnDBCluster(this, 'encrypted', { storageEncrypted: storageEncrypted });

  const storageUnencrypted = false;

  new CfnDBCluster(this, 'unencrypted');                                                                                 // Noncompliant {{Omitting storageEncrypted disables RDS encryption. Make sure it is safe here.}}
//    ^^^^^^^^^^^^
  new CfnDBCluster(this, 'unencrypted', undefined);                                                                      // Noncompliant {{Omitting storageEncrypted disables RDS encryption. Make sure it is safe here.}}
//    ^^^^^^^^^^^^
  new CfnDBCluster(this, 'unencrypted', {});                                                                             // Noncompliant {{Omitting storageEncrypted disables RDS encryption. Make sure it is safe here.}}
//                                      ^^
  new CfnDBCluster(this, 'unencrypted', { storageEncrypted: false });                                                    // Noncompliant {{Make sure that using unencrypted storage is safe here.}}
//                                                          ^^^^^
  new CfnDBCluster(this, 'unencrypted', { storageEncrypted: storageUnencrypted });                                       // Noncompliant {{Make sure that using unencrypted storage is safe here.}}
//                                                          ^^^^^^^^^^^^^^^^^^
  new CfnDBCluster(this, 'unencrypted', { storageEncryptionKey: new Key(this, 'key', props), storageEncrypted: false }); // Noncompliant {{Make sure that using unencrypted storage is safe here.}}
//                                                                                                             ^^^^^
}

function cfnDBInstance() {

  const storageEncrypted = true;

  new CfnDBInstance(this, 'encrypted', unknown);
  new CfnDBInstance(this, 'encrypted', { storageEncrypted: true });
  new CfnDBInstance(this, 'encrypted', { storageEncrypted: unknown });
  new CfnDBInstance(this, 'encrypted', { storageEncrypted });
  new CfnDBInstance(this, 'encrypted', { storageEncrypted: storageEncrypted });

  const storageUnencrypted = false;

  new CfnDBInstance(this, 'unencrypted');                                                                                 // Noncompliant {{Omitting storageEncrypted disables RDS encryption. Make sure it is safe here.}}
//    ^^^^^^^^^^^^^
  new CfnDBInstance(this, 'unencrypted', undefined);                                                                      // Noncompliant {{Omitting storageEncrypted disables RDS encryption. Make sure it is safe here.}}
//    ^^^^^^^^^^^^^
  new CfnDBInstance(this, 'unencrypted', {});                                                                             // Noncompliant {{Omitting storageEncrypted disables RDS encryption. Make sure it is safe here.}}
//                                       ^^
  new CfnDBInstance(this, 'unencrypted', { storageEncrypted: false });                                                    // Noncompliant {{Make sure that using unencrypted storage is safe here.}}
//                                                           ^^^^^
  new CfnDBInstance(this, 'unencrypted', { storageEncrypted: storageUnencrypted });                                       // Noncompliant {{Make sure that using unencrypted storage is safe here.}}
//                                                           ^^^^^^^^^^^^^^^^^^
  new CfnDBInstance(this, 'unencrypted', { storageEncryptionKey: new Key(this, 'key', props), storageEncrypted: false }); // Noncompliant {{Make sure that using unencrypted storage is safe here.}}
//                                                                                                              ^^^^^
}

function databaseCluster() {

  const storageEncrypted = true;

  new DatabaseCluster(this, 'encrypted', unknown);
  new DatabaseCluster(this, 'encrypted', { storageEncrypted: true });
  new DatabaseCluster(this, 'encrypted', { storageEncrypted: unknown });
  new DatabaseCluster(this, 'encrypted', { storageEncrypted });
  new DatabaseCluster(this, 'encrypted', { storageEncrypted: storageEncrypted });

  const storageUnencrypted = false;

  new DatabaseCluster(this, 'unencrypted');                                            // Noncompliant {{Omitting storageEncrypted disables RDS encryption. Make sure it is safe here.}}
//    ^^^^^^^^^^^^^^^
  new DatabaseCluster(this, 'unencrypted', undefined);                                 // Noncompliant {{Omitting storageEncrypted disables RDS encryption. Make sure it is safe here.}}
//    ^^^^^^^^^^^^^^^
  new DatabaseCluster(this, 'unencrypted', {});                                        // Noncompliant {{Omitting storageEncrypted disables RDS encryption. Make sure it is safe here.}}
//                                         ^^
  new DatabaseCluster(this, 'unencrypted', { storageEncrypted: false });               // Noncompliant {{Make sure that using unencrypted storage is safe here.}}
//                                                             ^^^^^
  new DatabaseCluster(this, 'unencrypted', { storageEncrypted: storageUnencrypted });  // Noncompliant {{Make sure that using unencrypted storage is safe here.}}
//                                                             ^^^^^^^^^^^^^^^^^^

  const alias = new Alias(this, 'alias', props);
  const key = new Key(this, 'key', props);

  new DatabaseCluster(this, 'unencrypted', { storageEncryptionKey: alias });
  new DatabaseCluster(this, 'unencrypted', { storageEncryptionKey: key });
  new DatabaseCluster(this, 'unencrypted', { storageEncryptionKey: key, storageEncrypted: false });
  new DatabaseCluster(this, 'unencrypted', { storageEncryptionKey: key, storageEncrypted: unknown });

  new DatabaseCluster(this, 'unencrypted', { storageEncryptionKey: 42, storageEncrypted: false });      // Noncompliant {{Make sure that using unencrypted storage is safe here.}}
//                                                                                       ^^^^^
  new DatabaseCluster(this, 'unencrypted', { storageEncryptionKey: new C(), storageEncrypted: false }); // Noncompliant {{Make sure that using unencrypted storage is safe here.}}
//                                                                                            ^^^^^
}

function databaseClusterFromSnapshot() {

  const storageEncrypted = true;

  new DatabaseClusterFromSnapshot(this, 'encrypted', unknown);
  new DatabaseClusterFromSnapshot(this, 'encrypted', { storageEncrypted: true });
  new DatabaseClusterFromSnapshot(this, 'encrypted', { storageEncrypted: unknown });
  new DatabaseClusterFromSnapshot(this, 'encrypted', { storageEncrypted });
  new DatabaseClusterFromSnapshot(this, 'encrypted', { storageEncrypted: storageEncrypted });

  const storageUnencrypted = false;

  new DatabaseClusterFromSnapshot(this, 'unencrypted');                                                             // Noncompliant {{Omitting storageEncrypted disables RDS encryption. Make sure it is safe here.}}
//    ^^^^^^^^^^^^^^^^^^^^^^^^^^^
  new DatabaseClusterFromSnapshot(this, 'unencrypted', undefined);                                                  // Noncompliant {{Omitting storageEncrypted disables RDS encryption. Make sure it is safe here.}}
//    ^^^^^^^^^^^^^^^^^^^^^^^^^^^
  new DatabaseClusterFromSnapshot(this, 'unencrypted', {});                                                         // Noncompliant {{Omitting storageEncrypted disables RDS encryption. Make sure it is safe here.}}
//                                                     ^^
  new DatabaseClusterFromSnapshot(this, 'unencrypted', { storageEncrypted: false });                                // Noncompliant {{Make sure that using unencrypted storage is safe here.}}
//                                                                         ^^^^^
  new DatabaseClusterFromSnapshot(this, 'unencrypted', { storageEncrypted: storageUnencrypted });                   // Noncompliant {{Make sure that using unencrypted storage is safe here.}}
//                                                                         ^^^^^^^^^^^^^^^^^^

  const alias = new Alias(this, 'alias', props);
  const key = new Key(this, 'key', props);

  new DatabaseClusterFromSnapshot(this, 'unencrypted', { storageEncryptionKey: alias });
  new DatabaseClusterFromSnapshot(this, 'unencrypted', { storageEncryptionKey: key });
  new DatabaseClusterFromSnapshot(this, 'unencrypted', { storageEncryptionKey: key, storageEncrypted: false });
  new DatabaseClusterFromSnapshot(this, 'unencrypted', { storageEncryptionKey: key, storageEncrypted: unknown });

  new DatabaseClusterFromSnapshot(this, 'unencrypted', { storageEncryptionKey: 42, storageEncrypted: false });      // Noncompliant {{Make sure that using unencrypted storage is safe here.}}
//                                                                                                   ^^^^^
  new DatabaseClusterFromSnapshot(this, 'unencrypted', { storageEncryptionKey: new C(), storageEncrypted: false }); // Noncompliant {{Make sure that using unencrypted storage is safe here.}}
//                                                                                                        ^^^^^
}

function databaseInstance() {

  const storageEncrypted = true;

  new DatabaseInstance(this, 'encrypted', unknown);
  new DatabaseInstance(this, 'encrypted', { storageEncrypted: true });
  new DatabaseInstance(this, 'encrypted', { storageEncrypted: unknown });
  new DatabaseInstance(this, 'encrypted', { storageEncrypted });
  new DatabaseInstance(this, 'encrypted', { storageEncrypted: storageEncrypted });

  const storageUnencrypted = false;

  new DatabaseInstance(this, 'unencrypted');                                                             // Noncompliant {{Omitting storageEncrypted disables RDS encryption. Make sure it is safe here.}}
//    ^^^^^^^^^^^^^^^^
  new DatabaseInstance(this, 'unencrypted', undefined);                                                  // Noncompliant {{Omitting storageEncrypted disables RDS encryption. Make sure it is safe here.}}
//    ^^^^^^^^^^^^^^^^
  new DatabaseInstance(this, 'unencrypted', {});                                                         // Noncompliant {{Omitting storageEncrypted disables RDS encryption. Make sure it is safe here.}}
//                                          ^^
  new DatabaseInstance(this, 'unencrypted', { storageEncrypted: false });                                // Noncompliant {{Make sure that using unencrypted storage is safe here.}}
//                                                              ^^^^^
  new DatabaseInstance(this, 'unencrypted', { storageEncrypted: storageUnencrypted });                   // Noncompliant {{Make sure that using unencrypted storage is safe here.}}
//                                                              ^^^^^^^^^^^^^^^^^^

  const alias = new Alias(this, 'alias', props);
  const key = new Key(this, 'key', props);

  new DatabaseInstance(this, 'unencrypted', { storageEncryptionKey: alias });
  new DatabaseInstance(this, 'unencrypted', { storageEncryptionKey: key });
  new DatabaseInstance(this, 'unencrypted', { storageEncryptionKey: key, storageEncrypted: false });
  new DatabaseInstance(this, 'unencrypted', { storageEncryptionKey: key, storageEncrypted: unknown });

  new DatabaseInstance(this, 'unencrypted', { storageEncryptionKey: 42, storageEncrypted: false });      // Noncompliant {{Make sure that using unencrypted storage is safe here.}}
//                                                                                        ^^^^^
  new DatabaseInstance(this, 'unencrypted', { storageEncryptionKey: new C(), storageEncrypted: false }); // Noncompliant {{Make sure that using unencrypted storage is safe here.}}
//                                                                                             ^^^^^
}

function databaseInstanceReadReplica() {

  const storageEncrypted = true;

  new DatabaseInstanceReadReplica(this, 'encrypted', unknown);
  new DatabaseInstanceReadReplica(this, 'encrypted', { storageEncrypted: true });
  new DatabaseInstanceReadReplica(this, 'encrypted', { storageEncrypted: unknown });
  new DatabaseInstanceReadReplica(this, 'encrypted', { storageEncrypted });
  new DatabaseInstanceReadReplica(this, 'encrypted', { storageEncrypted: storageEncrypted });

  const storageUnencrypted = false;

  new DatabaseInstanceReadReplica(this, 'unencrypted');                                                             // Noncompliant {{Omitting storageEncrypted disables RDS encryption. Make sure it is safe here.}}
//    ^^^^^^^^^^^^^^^^^^^^^^^^^^^
  new DatabaseInstanceReadReplica(this, 'unencrypted', undefined);                                                  // Noncompliant {{Omitting storageEncrypted disables RDS encryption. Make sure it is safe here.}}
//    ^^^^^^^^^^^^^^^^^^^^^^^^^^^
  new DatabaseInstanceReadReplica(this, 'unencrypted', {});                                                         // Noncompliant {{Omitting storageEncrypted disables RDS encryption. Make sure it is safe here.}}
//                                                     ^^
  new DatabaseInstanceReadReplica(this, 'unencrypted', { storageEncrypted: false });                                // Noncompliant {{Make sure that using unencrypted storage is safe here.}}
//                                                                         ^^^^^
  new DatabaseInstanceReadReplica(this, 'unencrypted', { storageEncrypted: storageUnencrypted });                   // Noncompliant {{Make sure that using unencrypted storage is safe here.}}
//                                                                         ^^^^^^^^^^^^^^^^^^

  const alias = new Alias(this, 'alias', props);
  const key = new Key(this, 'key', props);

  new DatabaseInstanceReadReplica(this, 'unencrypted', { storageEncryptionKey: alias });
  new DatabaseInstanceReadReplica(this, 'unencrypted', { storageEncryptionKey: key });
  new DatabaseInstanceReadReplica(this, 'unencrypted', { storageEncryptionKey: key, storageEncrypted: false });
  new DatabaseInstanceReadReplica(this, 'unencrypted', { storageEncryptionKey: key, storageEncrypted: unknown });

  new DatabaseInstanceReadReplica(this, 'unencrypted', { storageEncryptionKey: 42, storageEncrypted: false });      // Noncompliant {{Make sure that using unencrypted storage is safe here.}}
//                                                                                                   ^^^^^
  new DatabaseInstanceReadReplica(this, 'unencrypted', { storageEncryptionKey: new C(), storageEncrypted: false }); // Noncompliant {{Make sure that using unencrypted storage is safe here.}}
//                                                                                                        ^^^^^
}
