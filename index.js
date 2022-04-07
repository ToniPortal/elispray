const mysql = require('mysql'),
    express = require('express'),
    session = require('express-session'),
    path = require('path'),
    cluster = require('cluster'),
    cookieParser = require('cookie-parser'),
    port = (process.env.PORT || 3000),
    portws = (process.env.PORT || 8080),
    validator = require('validator'),
    sanitizeHtml = require('sanitize-html'),
    helmet = require("helmet"),
    { XXHash32, XXHash64, XXHash3 } = require('xxhash-addon'),
    hasher3 = new XXHash3(require('fs').readFileSync('package-lock.json')),
    app = express();





// For Master process
if (cluster.isMaster) {
    console.log(`Master ${process.pid} is running`);


    // Fork workers.

    cluster.fork();



    // This event is firs when worker died
    cluster.on('exit', (worker, code, signal) => {
        console.log(`worker ${worker.process.pid} died`);
    });
} else { // For Worker
    // Workers can share any TCP connection
    // In this case it is an HTTP server

    server = app.listen(port, err => {
        err ?
            console.log("Error in server setup") :
            console.log(`Worker ${process.pid} started`);
    });

    const connection = mysql.createConnection({ //connection bdd
        host: 'mysql-bellone.alwaysdata.net',
        user: 'bellone',
        password: 'nerfakshan',
        database: 'bellone_login'
    });

    var expiryDate = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    app.use(session({
        name: 'session',
        secret: 'r4J8cw5CSn',
        keys: ['key1', 'key2'],
        cookie: {
            resave: true,
            secure: true,
            httpOnly: true,
            domain: 'https://elisplay.herokuapp.com/',
            path: '/',
            expires: expiryDate
        }
    }));

    app.use(helmet());
    app.use(cookieParser());
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(express.static(path.join(__dirname, 'Page web')));
    app.disable('x-powered-by');


    function p(p) {
        return path.join(`${__dirname}/Page web/${p}.html`)
    }

    // http://localhost:3000/
    app.get('/', function(request, res) {

        if (request.cookies.home == "nohome") {
            // Render login template
            res.redirect("/login")

        } else {
            res.cookie(`home`, `nohome`);
            res.sendFile(p('Elisplay'));
        }


    });

    app.get('/play', function(request, res) {
        // Render login template
        if (request.session.loggedin) {
            res.sendFile(p('pagePlay2'));

        } else {
            // Pas connectée.
            res.redirect("/login")
        }
    });


    app.get('/tetris', function(request, res) {
        // Render login template
        if (request.session.loggedin) {
            res.sendFile(path.join(__dirname + '/Page web/tetris.html'));

        } else {
            // Pas connectée.
            res.redirect("/login")
        }
    });

    app.get('/court', function(request, res) {
        // Render login template
        if (request.session.loggedin) {
            res.sendFile(path.join(__dirname + '/Page web/court.html'));

        } else {
            // Pas connectée.
            res.redirect("/login")
        }
    });



    app.get('/login', function(request, res) {

        if (request.session.loggedin) {

            res.redirect("/play")

        } else {
            // Render login template
            res.sendFile(path.join(__dirname + '/Page web/login.html'));
        }
    });


    app.get('/create', function(request, res) {
        // Render login template
        res.sendFile(path.join(__dirname + '/Page web/create.html'));
    });


    function hash3(password) {
        const pass = `${password}XHAMAC1guUCaI9jUu6E3s3SCORAfZQqAqt0ty8VGQL1yWfPnSoJuRiip5mmnlISkXFyxaLpQdNpqYZSDSxZ25IP1AUAncFOsbsMY11VfyeilrWiIjNPdQ3MAc2FSBjMVJbSrGj6`;

        const buf_pass = Buffer.from(pass);
        const passwords = hasher3.hash(buf_pass);
        hasher3.reset();
        return passwords;
    }


    app.post('/create', function(request, res) {

        // Capture the input fields
        let username = validate(request.body.username);
        let anvanthast = request.body.password;
        let password = hash3(anvanthast);

        if (typeof username != "string" || (password).lastIndexOf("DROP") != -1) {
            res.send("Parametres invalides");
            res.end();
            return;
        }
        // Ensure the input fields exists and are not empty
        if (username && password) {
            // Execute SQL query that'll select the account from the database based on the specified username and password

            //INSERT INTO `accounts` (`id`, `username`, `password`, `highscore1`) VALUES (1, 'test', 'test', 0);

            connection.query('SELECT username FROM accounts', function(error, resultaccount, fields) {
                // If there is an issue with the query, output the error
                if (error) {
                    console.log(error);
                    return res.redirect("/login");
                }
                var verifusername = false;
                for (i = 0; i < Object.keys(resultaccount).length; i++) {
                    if (resultaccount[i].username == username) {
                        verifusername = true;
                    }
                }

                if (verifusername == false) {
                    connection.query(`INSERT INTO \`accounts\` (\`username\`, \`password\`, \`snake\`, \`tetris\`, \`td\`, \`court\`, \`brick\`, \`flappy\`, \`highscore1\`) VALUES ('${username}', '${password}', 0,0,0,0,0,0,0);`, [username, password], function(error, results, fields) {
                        // If there is an issue with the query, output the error
                        if (error) {
                            console.log(error);
                            return res.redirect("/login");
                        }
                        // If the account exists

                        if (results.protocol41 == true) {
                            request.session.loggedin = true;
                            request.session.username = username;
                            // rediction page play.
                            res.redirect('/play');
                        } else {
                            res.redirect("/create")
                        }
                        res.end();
                    });
                } else {
                    res.send('Il a déjà un utilisateur avec ce nom là !');
                    res.end();
                }
            });




        } else {
            res.send('Veuillez entrer un Username et un Password!');
            res.end();
        }

    });

    app.post('/updatepass', function(request, res) {

        let username = validate(request.body.username);
        let password = hash3(request.body.password);



        if (typeof username != "string" || (password).lastIndexOf("DROP") != -1) {
            res.send("Paramètre invalide");
            res.end();
            return;
        }

        connection.query(`UPDATE accounts SET password=\'${password}\' WHERE username =\'${username}\';`, function(error, results, fields) {
            // If there is an issue with the query, output the error
            if (error) {
                console.log(error);
                return res.redirect("/login");
            }
            // If the account exists

            if (results.protocol41 == true) {

            } else {
                res.redirect("/manage")
            }
            res.end();
        });

    });

    app.get('/updatepass', function(request, res) {

        if (request.session.loggedin) {

            res.sendFile(path.join(__dirname + '/Page web/manage.html'));

        } else {
            // Render login template
            res.redirect('/login')
        }
    });


    function validate(string) {
        return String(validator.escape(string));
    }


    // http://localhost:3000/auth
    app.post('/auth', function(request, res) {

        let username = validate(request.body.username);
        let password = hash3(request.body.password);

        if (username && password) {
            connection.query(`SELECT * FROM accounts WHERE username = '${username}' AND password = '${password}'`, function(error, results, fields) {
                if (error) {
                    console.log(error);
                    return res.redirect("/login");
                }
                console.log(results[0].password)
                if (results[0].password == password && results.length > 0) {
                    request.session.loggedin = true;
                    request.session.username = username;
                    // rediction page play.
                    res.redirect('/play');
                } else {
                    res.send("Mauvais Nom d'utlisateur et/ou mauvais mot de passe<br><a href=javascript:history.go(-1)>Retour</a>");
                }
                res.end();
            });
        } else {
            res.send("Veuillez rentrer un Nom d'utlisateur et mot de passe<br><a href=javascript:history.go(-1)>Retour</a>");
            res.end();
        }
    });


    app.get('/snake', function(request, res) {

        if (request.session.loggedin) {
            res.sendFile(path.join(__dirname + '/Page web/snake.html'));
        } else {
            // Pas connectée.
            res.redirect("/login")
        }
    });

    app.post('/highscore', function(request, res) {
        // Capture the input fields
        var highscore = Number(request.body.highscore);
        var qui = validate(request.body.qui);
        var username = validate(request.session.username);


        connection.query(`SELECT ${qui} FROM \`accounts\` WHERE username = '${username}'`, function(error, results, fields) {
            // If there is an issue with the query, output the error
            if (error) {
                console.log(error);
                return res.redirect("/login");
            }
            // console.log(`UPDATE \`accounts\` SET ${qui} = ${highscore} WHERE username = '${username}';`)
            // console.log("highscore : " + highscore);
            // console.log("results : " + results[0].snake);
            if (results[0].snake < highscore) {
                //UPDATE `accounts` SET snake = 0 WHERE username = 'localhost';
                connection.query(`UPDATE \`accounts\` SET ${qui} = ${highscore} WHERE username = '${username}';`, function(error, results, fields) {
                    // If there is an issue with the query, output the error"
                    if (error) {
                        console.log(error);
                        return res.redirect("/login");
                    }
                });
            } else {
                console.log("Non nécessaire de faire une demande a la bdd car il a un meilleur score sur la bdd");
                res.end();
            }


        });

    });


    const cheerio = require('cheerio');

    var highscoretableaucomplet = {
        "username": ["", ""],
        "snake": [0, 0],
    }

    var count = 0;

    app.post('/gg', function(request, res) {

        if (request.session.loggedin) {

            connection.query(`SELECT username,snake FROM accounts`, function(error, results, fields) {
                // If there is an issue with the query, output the error
                if (error) {
                    console.log(error);
                    return res.redirect("/login");
                }
                count = Object.keys(results).length;
                for (i = 0; i < count; i++) {
                    highscoretableaucomplet.username[i] = results[i].username;

                    highscoretableaucomplet.snake[i] = results[i].snake;

                }

                res.redirect("/gg");

            })

        } else {
            // Pas connectée.
            res.redirect("/login")
        }

    });

    app.get('/gg', function(request, res) {

        c
        const document = `<!DOCTYPE html>
        <html>
        
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width,minimum-scale=1">
            <title>GG</title>
        </head>
        
        <body>
            <form action="/gg" method="post"> <label for="gg">
                        <!-- font awesome icon --> <i class="fas fa-gg"></i>
                    </label> <input type="submit" value="gg"> </form>
            <table>
                <tr>
                    <th>Username</th>
                    <th>Snake</th>
                    <th>Tetris</th>
                    <th>TD</th>
                    <th>Speed</th>
                    <th>Brick</th>
                    <th>Flappy</th>
                </tr>
                <tr>
                    <td>Name</td>
                    <td>0</td>
                    <td>0</td>
                    <td>0</td>
                    <td>0</td>
                    <td>0</td>
                    <td>0</td>
                </tr>
            </table>
        </body>
        
        </html>`;

        const $ = cheerio.load(document);



        for (i = 0; i < count; i++) {
            $('table').append(`<tr><td>${highscoretableaucomplet.username[i]}</td><td>${highscoretableaucomplet.snake[i]}</td></tr>`);
        }

        //	$('h2.title').text(`Votre Score : ${result[0].highscore1}`);

        res.send($.html());

        res.end();


    });

    const io = require("socket.io")(server)
        // server-side
    io.on("connection", (socket) => {
        // console.log("Connection:" + socket.id); // x8WIv7-mJelg7on_ALbx

        socket.conn.on("upgrade", () => {
            const upgradedTransport = socket.conn.transport.name; // in most cases, "websocket"
            console.log(upgradedTransport)
        });

        socket.on("msg", (username, msg) => {
            io.to("chat").emit("helloserv", username, validate(msg));
        });

        socket.on("typingserv", (arg, username) => {
            io.to("chat").emit("typing", arg, username);
        });

        socket.on("nvplayerserv", (arg, username) => {
            socket.join("chat");

            io.to("chat").emit("nvplayer", arg, username);
        });

        socket.on("typingserv", (arg, username) => {
            io.to("chat").emit("typing", arg, username);
        });




        //Serv court
        socket.on("courtconnectserv", (id, nbroom) => {
            console.log(`nbchambre: ${nbroom}`)
            socket.join(nbroom);
            io.to(nbroom).emit("nvplayercourt", id, nbroom);
        });

        socket.on("ggtoucheserv", (id, nbroom) => {
            console.log("ggtoucheserv" + nbroom)
            io.to(nbroom).emit("perdue", id);
        });

        socket.on("perduetoucheserv", (id, nbroom) => {
            io.to(nbroom).emit("gg", id);
        });


        socket.on("perduetoucheserv", (id, nbroom) => {
            io.to(nbroom).emit("gg", id, nbroom);
        });

    });

    // Render chat
    app.set('view engine', 'ejs')

    app.get('/chat', function(request, res) {
        if (request.session.loggedin) {

            res.render('chat');

        } else {
            // Pas connectée.
            res.redirect("/login")
        }

    });

    app.get('/username', function(request, res) {

        if (request.session.loggedin) {

            let usernames = request.session.username;
            res.json(`{"user":"${usernames}"}`)

        } else {
            // Pas connectée.
            res.redirect("/login")
        }

    });

    app.get('/game', function(request, res) {
        if (request.session.loggedin) {

            res.render('game')

        } else {
            // Pas connectée.
            res.redirect("/login")
        }

    });

    app.get('/td', function(request, res) {
        if (request.session.loggedin) {

            res.sendFile(path.join(__dirname + '/Page web/td/index.html'));

        } else {
            // Pas connectée.
            res.redirect("/login")
        }

    });

    app.get('/snake2', function(request, res) {
        if (request.session.loggedin) {

            res.sendFile(path.join(__dirname + '/Page web/snake2.html'));

        } else {
            // Pas connectée.
            res.redirect("/login")
        }

    });

    app.get('/brick', function(request, res) {
        if (request.session.loggedin) {

            res.sendFile(path.join(__dirname + '/Page web/brick/index.html'));

        } else {
            // Pas connectée.
            res.redirect("/login")
        }

    });

    app.get('/undertale', function(request, res) {
        if (request.session.loggedin) {

            res.sendFile(path.join(__dirname + '/Page web/undertale/index.html'));

        } else {
            // Pas connectée.
            res.redirect("/login")
        }

    });

    app.get('/pong', function(request, res) {
        if (request.session.loggedin) {

            res.sendFile(path.join(__dirname + '/Page web/pong/index.html'));

        } else {
            // Pas connectée.
            res.redirect("/login")
        }

    });


    //WebSocket

    app.get('/ws', function(request, res) {
        if (request.session.loggedin) {

            res.sendFile(path.join(__dirname + '/Page web/ws.html'));

        } else {
            // Pas connectée.
            res.redirect("/login")
        }

    });

    const { WebSocketServer } = require('ws')

    const wss = new WebSocketServer({ port: 8080 })

    wss.on('connection', (ws) => {
        ws.on('message', (message) => {
            console.log(`Received message => ${message}`)
        })
        ws.send('ho!')
    })


    //Truc d'email
    app.post('/envoie', function(request, res) {

        let info = request.session.info;

        if (request.session.loggedin) {


        } else {
            // Pas connectée.
            res.redirect("/login")
        }

    });

    app.get('/envoie', function(request, res) {
        if (request.session.loggedin) {

            res.sendFile(path.join(__dirname + '/Page web/envoie.html'));

        } else {
            // Pas connectée.
            res.redirect("/login")
        }

    });

}