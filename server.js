const http = require('http');
const fs = require('fs');

const { Player } = require('./game/class/player');
const { World } = require('./game/class/world');

const worldData = require('./game/data/basic-world-data');

let player;
let world = new World();
world.loadWorld(worldData);

const server = http.createServer((req, res) => {

  /* ============== ASSEMBLE THE REQUEST BODY AS A STRING =============== */
  let reqBody = '';
  req.on('data', (data) => {
    reqBody += data;
  });

  req.on('end', () => { // After the assembly of the request body is finished
    /* ==================== PARSE THE REQUEST BODY ====================== */
    if (reqBody) {
      req.body = reqBody
        .split("&")
        .map((keyValuePair) => keyValuePair.split("="))
        .map(([key, value]) => [key, value.replace(/\+/g, " ")])
        .map(([key, value]) => [key, decodeURIComponent(value)])
        .reduce((acc, [key, value]) => {
          acc[key] = value;
          return acc;
        }, {});
    }

    /* ======================== ROUTE HANDLERS ========================== */
    // Phase 1: GET /
    if(req.method === 'GET' && req.url === '/'){
        let htmlPage = fs.readFileSync('./views/new-player.html', 'utf-8')

        resBody = htmlPage
        .replace(/#{availableRooms}/g, world.availableRoomsToString());

        res.statusCode = 200
        res.setHeader('Content-Type', 'text/html')
        res.end(resBody)
    }
    // Phase 2: POST /player
    if(req.method === 'POST' && req.url === '/player'){
      let roomId = req.body.roomId
      let roomInstance = world.rooms[roomId]

      player = new Player(req.body.name, roomInstance)

      res.statusCode = 302
      res.setHeader('Location', `/rooms/${roomId}`)
      res.end()
      return
    }
    // Phase 3: GET /rooms/:roomId

    if(req.method === 'GET' && req.url.startsWith('/rooms/') ){
      const urlParts = req.url.split('/')
      const roomId = urlParts[2]
      const room = world.rooms[roomId]

      let currentPlayerRoomId = player.currentRoom.id

      if(Number(roomId) !== currentPlayerRoomId ){
        res.statusCode = 302
        res.setHeader('Location', `/rooms/${currentPlayerRoomId}`)
        res.end()
        return
      }
      if (urlParts.length === 3){


          let htmlPage = fs.readFileSync('./views/room.html', 'utf-8')

          const resBody = htmlPage
          .replace(/#{roomName}/g, room.name)
          .replace(/#{roomId}/g, roomId)
          .replace(/#{roomItems}/g, room.itemsToString())
          .replace(/#{inventory}/g, player.inventoryToString())
          .replace(/#{exits}/g, room.exitsToString());

              res.statusCode = 200
              res.setHeader('Content-type', 'text/html')
              return res.end(resBody)
      }

    }

    // Phase 4: GET /rooms/:roomId/:direction
      let urLength = req.url.split('/').length

    if(req.method === 'GET' && req.url.startsWith('/rooms/') && urLength === 4){
                let urlParts = req.url.split('/')
                let roomId = urlParts[2]
                let direction = urlParts[3]


                let currentPlayerRoomId = player.currentRoom.id

                if(Number(roomId) !== currentPlayerRoomId ){
                  res.statusCode = 302
                  res.setHeader('Location', `/rooms/${currentPlayerRoomId}`)
                  res.end()
                  return
                }

                try{
                  player.move(direction[0])

                  res.statusCode = 302
                  res.setHeader('Location', `/rooms/${currentPlayerRoomId}`)
                  res.end()
                  return
                } catch(err){
                  res.statusCode = 302
                  res.setHeader('Location', `/rooms/${roomId}`)
                  res.end()
                  return
                }


    }

    // Phase 5: POST /items/:itemId/:action
      if(req.method === 'POST' && req.url.startsWith('/items/')){
            let urlParts = req.url.split('/') //['', items, :itemId, :action]
            let currentItemId = urlParts[2]
            let action = urlParts[3]
            let currentRoomId = player.currentRoom.id

          try{
            switch(action){
              case 'drop':
                player.dropItem(currentItemId);
                  break
              case 'eat':
                player.eatItem(currentItemId)
                  break
              case 'take':
                player.takeItem(currentItemId);
                  break;
            }

            //let randomNum = Math.floor(Math.random() * (6 - 1) + 1)

            res.statusCode = 302;
            res.setHeader('Location',  `/rooms/${currentRoomId}`)
            res.end()
            return

          }catch(e){
              let htmlPage = fs.readFileSync('views/error.html', 'utf-8')

            let resBody = htmlPage
                .replace(/#{errorMessage}/g, e.message)
                .replace(/#{roomId}/g, currentRoomId)

              res.statusCode = 302
              res.setHeader('Location', `/views/error.html`)
              return res.end(resBody)
          }
      }
    // Phase 6: Redirect if no matching route handlers
  })
});

const port = 5000;

server.listen(port, () => console.log('Server is listening on port', port));
