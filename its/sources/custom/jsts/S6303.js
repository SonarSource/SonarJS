import { DatabaseCluster} from 'aws-cdk-lib/aws-rds';

new DatabaseCluster(this, 'sensitive', { engine: 'mariadb' }); // Sensitive
new DatabaseCluster(this, 'sensitive', { engine: 'mariadb', storageEncrypted: false }); // Sensitive
