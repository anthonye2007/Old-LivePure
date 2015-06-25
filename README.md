## To Run
- start mongod
  - mongod --config /usr/local/etc/mongod.conf
  - run `mongo` to ensure mongod is running. It should start a mongo prompt.
- `npm start`

## SSH into server
- `ssh -p 62217 anthony@livepur.cloudapp.net`  

## Build requirements
- git
- nodejs
- npm
- mongodb-server

### To Build
- git clone https://github.com/anthonye2007/LivePure.git
- cd LivePure
- npm install
- npm start
This should start the server in development mode on port 3000

## Production
- run `sudo PORT=80 NODE_ENV=production npm start`
