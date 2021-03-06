// Core interfaces
import { createAgent, IDIDManager, IKeyManager } from '@veramo/core'

// Core identity manager plugin
import { DIDManager } from '@veramo/did-manager'

// Ethr did identity provider
import { EthrDIDProvider } from '@veramo/did-provider-ethr'

// Web did identity provider
import { WebDIDProvider } from '@veramo/did-provider-web'

// Core key manager plugin
import { KeyManager } from '@veramo/key-manager'

// Custom key management system for RN
import { KeyManagementSystem } from '@veramo/kms-local'

//
import { CredentialIssuer, ICredentialIssuer} from '@veramo/credential-w3c'

// Custom resolvers
import { Resolver } from 'did-resolver'
import { getResolver as ethrDidResolver } from 'ethr-did-resolver'
import { getResolver as webDidResolver } from 'web-did-resolver'

// Storage plugin using TypeOrm
import { Entities, KeyStore, DIDStore } from '@veramo/data-store'

// TypeORM is installed with `@veramo/data-store`
import { createConnection } from 'typeorm'
import config from '@i3-market/config'

// This will be the name for the local sqlite database for demo purposes
const DATABASE_FILE = 'database.sqlite'

const dbConnection = createConnection({
  type: 'sqlite',
  database: DATABASE_FILE,
  synchronize: true,
  logging: ['error', 'info', 'warn'],
  entities: Entities,
})
 
const RINKEBY_PROVIDER_DATA = {
  defaultKms: 'local',
  network: 'rinkeby',
  rpcUrl: 'https://rinkeby.infura.io/ethr-did'
}

const I3M_PROVIDER_DATA = {
  defaultKms: 'local',
  network: 'i3m',
  rpcUrl: config.rpcUrl
}

const GANACHE_PROVIDER_DATA = {
  defaultKms: 'local',
  network: 'ganache',
  rpcUrl: 'http://127.0.0.1:8545'
}

const resolvers = {
  ...ethrDidResolver({
    networks: [I3M_PROVIDER_DATA, RINKEBY_PROVIDER_DATA, GANACHE_PROVIDER_DATA]
      .map(({ network, rpcUrl }) => ({
        name: network,
        rpcUrl
      }))
  }),
  ...webDidResolver()
}

export const resolver = new Resolver(resolvers)

export const agent = createAgent<IDIDManager & IKeyManager & ICredentialIssuer>({
  plugins: [
    new KeyManager({
      store: new KeyStore(dbConnection),
      kms: {
        local: new KeyManagementSystem(),
      },
    }),
    new DIDManager({
      store: new DIDStore(dbConnection),
      defaultProvider: 'did:ethr:rinkeby',
      //defaultProvider: 'did:ethr:i3m',
      //defaultProvider: 'did:ethr:ganache',
      providers: {
        'did:ethr:rinkeby': new EthrDIDProvider(RINKEBY_PROVIDER_DATA),
        'did:ethr:i3m': new EthrDIDProvider(I3M_PROVIDER_DATA),
        'did:ethr:ganache': new EthrDIDProvider(GANACHE_PROVIDER_DATA),
        'did:web': new WebDIDProvider({ defaultKms: 'local', })
      },
    }),
    new CredentialIssuer()
  ],
})
