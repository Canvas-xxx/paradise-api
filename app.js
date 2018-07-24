const express = require('express')
const app = express()
const mysql = require('mysql')
const cluster = require('cluster')
const os = require('os')
const bodyParser = require('body-parser')

const connection = mysql.createConnection({
    host: '203.121.143.61',
    port: 3306,
    user: 'root',
    password: 'P@radiseDBA1',
    database: 'PRDXS'
})

function start_app() {
  app.listen(8099, () => {
      console.log('Express on server Port 8099 !!')
      connection.connect( (err) => {
        if (err) throw err
      })
  })
}

if (cluster.isMaster) {
    let max_cpu = os.cpus().length
    for (let i=0; i < max_cpu; i++) {
        cluster.fork()
    }
} else {
    start_app()
    app.use(bodyParser.json())
    app.use(bodyParser.urlencoded({ extended: true }))
}

function authenLogin(data, callback) {
    connection.query('SELECT * FROM USER_LOGIN WHERE USER_ID = "' + data['username'] + '" AND USER_PASS = "' + data['password'] + '"',
    function(err, rows, fields) {
        if (err) throw err
        callback(rows)
    })
}

function updateSenderID(data, callback) {
    connection.query('UPDATE USER_LOGIN SET USER_NOTI_ID = "' + data['senderId'] + '" WHERE USER_ID = "' + data['username'] + '"',
    function(err, rows, fields) {
        if (err) throw err
        callback(rows)
    })
}

function getParentDetail(id, callback) {
    connection.query('SELECT * FROM PARENT_INFO WHERE PAR_SEQ_ID = "' + id + '"', function(err, rows, fields) {
        if (err) throw err
        callback(rows)
    })
}

function getStudenList(id, callback) {
    connection.query('SELECT * FROM STUDENT_INFO WHERE STU_PAR_SEQ_ID = "' + id + '"', function (err, rows, fields) {
        if (err) throw err
        callback(rows)
    })
}

function getStudentDetail(id, callback) {
    connection.query('SELECT * FROM STUDENT_INFO '
    + 'LEFT JOIN SCHOOL_INFO ON STUDENT_INFO.STU_SCH_SEQ_ID = SCHOOL_INFO.SCH_SEQ_ID '
    + 'WHERE STU_SEQ_ID = "' + id + '" '
    , function(err, rows, fields) {
        if (err) throw err
        callback(rows)
    })
}

function getStateStudent(id, callback) {
    // const today = new Date()
    // today.setHours(0, 0, 0, 0)
    // console.log(today)
    connection.query('SELECT * FROM STUDENT_BUS_TXN WHERE SBT_STU_SEQ_ID = "' + id + '"'
    , function(err, rows, fields) {
        if (err) throw err
        callback(rows)
    })
}

function getStateDetail(id, callback) {
    connection.query('SELECT * FROM STUDENT_BUS_TXN '
    + 'LEFT JOIN BUS_INFO ON STUDENT_BUS_TXN.SBT_BUS_SEQ_ID = BUS_INFO.BUS_SEQ_ID '
    + 'LEFT JOIN SCHOOL_INFO ON STUDENT_BUS_TXN.SBT_SCH_SEQ_ID = SCHOOL_INFO.SCH_SEQ_ID '
    + 'LEFT JOIN TEACHER_INFO ON BUS_INFO.BUS_TECH_SEQ_ID = TEACHER_INFO.TECH_SEQ_ID '
    + 'LEFT JOIN DRIVER_INFO ON BUS_INFO.BUS_DRV_SEQ_ID = DRIVER_INFO.DRV_SEQ_ID '
    + 'WHERE STUDENT_BUS_TXN.SBT_SEQ_ID = "' + id + '"'
    , function(err, rows, fields) {
        if (err) throw err
        callback(rows)
    })
}

app.get('/', (req, res) => {
    res.end(JSON.stringify('Welcome'))
})

app.post('/authenticationLogin', (req, res) => {
    const username = req.body.username
    let password = req.body.password

    // password = Buffer.from(password).toString()
    password = new Buffer(password).toString('base64')

    const data = {
        username: username,
        password: password
    }

    authenLogin(data, function(response) {
        if (response.length > 0) {
            res.writeHead(200, {'Content-Type': 'application/json'})
            res.end(JSON.stringify(response[0]))
        } else {
            res.writeHead(422, {'Content-Type': 'application/json'})
            res.end(JSON.stringify({ message: 'Invalid username or password.' }))
        }
    })
})

app.post('/updateSenderID', (req, res) => {
    const username = req.body.username
    const senderId = req.body.senderId

    const data = {
        username: username,
        senderId: senderId
    }

    updateSenderID(data, function(response) {
        if (response) {
            res.writeHead(200, {'Content-Type': 'application/json'})
            res.end(JSON.stringify({ status: 200, mss: 'SUCCESS' }))
        } else {
            res.writeHead(503, {'Content-Type': 'application/json'})
            res.end(JSON.stringify({ message: 'No content.' }))
        }
    })
})

app.get('/parentDetail', (req, res) => {
    const parentId = req.header('id')
    
    getParentDetail(parentId, function(response) {
        if (response.length > 0) {
            res.writeHead(200, {'Content-Type': 'application/json'})
            res.end(JSON.stringify(response[0]))
        } else {
            res.writeHead(503, {'Content-Type': 'application/json'})
            res.end(JSON.stringify({ message: 'No content.' }))
        }
    })
})

app.get('/studentList', (req, res) => {
    const parentId = req.header('id')
    
    getStudenList(parentId, function(response) {
        if (response.length > 0) {
            res.writeHead(200, {'Content-Type': 'application/json'})
            res.end(JSON.stringify(response))
        } else {
            res.writeHead(503, {'Content-Type': 'application/json'})
            res.end(JSON.stringify({ message: 'No content.' }))
        }
    })
})

app.get('/studentDetail', (req, res) => {
    const studentId = req.header('id')

    getStudentDetail(studentId, function(response) {
        if (response.length > 0) {
            res.writeHead(200, {'Content-Type': 'application/json'})  
            res.end(JSON.stringify(response[0]))
        } else {
            res.writeHead(200, {'Content-Type': 'application/json'})
            res.end(JSON.stringify({}))
        }
    })
})

app.get('/stateStudent', (req, res) => {
    const studentId = req.header('id')

    getStateDetail(studentId, function(response) {
        if (response.length > 0) {
            res.writeHead(200, {'Content-Type': 'application/json'})  
            res.end(JSON.stringify(response))
        } else {
            res.writeHead(200, {'Content-Type': 'application/json'})
            res.end(JSON.stringify([]))
        }
    })
})

app.get('/stateDetail', (req, res) => {
    const statetId = req.header('id')
 
    getStateDetail(statetId, function(response) {
        if (response.length > 0) {1 
            res.writeHead(200, {'Content-Type': 'application/json'})  
            res.end(JSON.stringify(response[0]))
        } else {
            res.writeHead(200, {'Content-Type': 'application/json'})
            res.end(JSON.stringify({}))
        }
    })
})
