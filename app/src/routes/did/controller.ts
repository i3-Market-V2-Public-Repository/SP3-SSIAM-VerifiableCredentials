import { RequestHandler } from 'express'
import { Credentials, SimpleSigner } from 'uport-credentials'
import { getResolver } from 'ethr-did-resolver'
import { Resolver } from 'did-resolver'
// import { decodeJWT } from "did-jwt"

import logger from '@i3-market/logger'
import config from '@i3-market/config'
import { SocketHandler } from '@i3-market/ws/utils'
import WebSocketServer from '../../ws'

const transports = require('uport-transports').transport
const message = require('uport-transports').message.util



//import { EthrCredentialRevoker } from 'ethr-status-registry'
//import { sign } from 'ethjs-signer'
//const didJWT = require('did-jwt')

interface SocketParams {
  uid: string
}

interface SocketData {
  hello: string
}

export default class InteractionController {

  protected credentials: Credentials

  constructor (protected wss: WebSocketServer) { }

  public async initialize () {
    const providerConfig = { rpcUrl: 'https://rinkeby.infura.io/ethr-did' }
    const identity = await config.identityPromise
    this.credentials = new Credentials({
      did: identity.did,
      signer: SimpleSigner(identity.privateKey),
      resolver: new Resolver(getResolver(providerConfig))
    })
  }

  // WebSocket Methods
  socketConnect: SocketHandler<SocketParams> = async (socket, req) => {  
    console.log('socket connect')  
    let socketid = req.params.uid.split('/');
    console.log(socketid[0])
    socket.tag(socketid[0])
  }

  socketMessage: SocketHandler<SocketParams, SocketData> = async (socket, req) => {
    logger.debug('Message socket')
    const json = req.json()
    console.log(json.hello)
  }

  socketClose: SocketHandler<SocketParams> = async () => {
    logger.debug('Close socket')
  }

  


  /**
   * GET /did/{callbackurl} - get did by login process and callback
   * 
   */
  authenticate: RequestHandler = async (req, res, next) => {

    //TODO: inizializzare la socket 
    const uid = '123uidtest'

    const callbackUrl = `https://${req.get('host')}/did/callback/${uid}/${req.params.callbackurl}`
    const reqToken = await this.credentials.createDisclosureRequest({
      notifications: true,
      callbackUrl        
    })
    logger.debug(reqToken) //TODO:
    //logger.debug(reqToken)
    const query = message.messageToURI(reqToken)
    const uri = message.paramsToQueryString(query, { callback_type: 'post' })
    const qr = transports.ui.getImageDataURI(uri)

    logger.debug('Authenticate interaction received')
    logger.debug(callbackUrl)
    const title: string = 'Authenticate'
    return res.render('authenticate', { qr, title })

  }

  /**
   * Authenticate api callback
   */
  authenticateCallback: RequestHandler = async (req, res, next) => {
    logger.debug('Authenticate callback')    
    const { error: err, access_token: accessToken } = req.body   
    const { callbackurl } = req.params

    if (err) { 
      return res.status(403).send(err) 
    }

    const credentials = await this.credentials.authenticateDisclosureResponse(accessToken) 

    console.log(credentials)
    
    let socketid = callbackurl.split('/')
    const socket = this.wss.get(socketid[0])
    console.log('socketid: ', socketid[0])
    if (!socket) {
      logger.debug('The client was disconnected before sending the did...')
    } else {      
      socket.send(credentials.did + ','+ callbackurl)
      socket.close()
    }
  }
}