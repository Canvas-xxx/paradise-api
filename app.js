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
    connection.query('SELECT * FROM USER_LOGIN '
    + 'WHERE USER_ID = "' + data['username'] + '" AND USER_PASS = "' + data['password'] + '"'
    , function(err, rows, fields) {
        if (err) throw err
        callback(rows)
    })
}

function updateUser(data, callback) {
    connection.query('UPDATE USER_LOGIN SET USER_PASS = "' + data['password'] + '"'
    + ', USER_UPDATE_BY = "' + data['username'] + '"'
    + ', USER_UPDATE_DATE = CURRENT_TIMESTAMP'
    + ' WHERE USER_ID = "' + data['username'] + '"'
    , function(err, rows, fields) {
        if (err) throw err
        callback(rows)
    })
}

function updateSenderID(data, callback) {
    connection.query('INSERT INTO NOTIFICATION_INFO(NOTI_USER_ID, NOTI_PAR_SEQ_ID, NOTI_SCH_SEQ_ID, NOTI_ID, NOTI_CREATE_BY, NOTI_UPDATE_BY, NOTI_CREATE_DATE, NOTI_UPDATE_Date) '
    + 'VALUES ("' + data['username'] + '", "' + data['parentId'] + '", "' + data['schoolId'] + '", "' + data['senderId'] + '", "' + data['username'] + '", "' + data['username'] + '", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
    function(err, rows, fields) {
        if (err) throw err
        callback(rows)
    })
}

function deleteSenderID(id, callback) {
    connection.query('DELETE FROM NOTIFICATION_INFO WHERE NOTI_ID = "' + id + '"', function(err, rows, fields) {
        if(err) throw err
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
    connection.query('SELECT * FROM STUDENT_INFO WHERE STU_PAR_SEQ_ID = "' + id + '"'
    , function (err, rows, fields) {
        if (err) throw err
        callback(rows)
    })
}

function getStudentDetail(id, callback) {
    connection.query('SELECT * FROM STUDENT_INFO '
    + 'LEFT JOIN SCHOOL_INFO ON STUDENT_INFO.STU_SCH_SEQ_ID = SCHOOL_INFO.SCH_SEQ_ID '
    + 'LEFT JOIN BUS_INFO ON STUDENT_INFO.STU_BUS_SEQ_ID = BUS_INFO.BUS_SEQ_ID '
    + 'LEFT JOIN TEACHER_INFO ON BUS_INFO.BUS_TECH_SEQ_ID = TEACHER_INFO.TECH_SEQ_ID '
    + 'LEFT JOIN DRIVER_INFO ON BUS_INFO.BUS_DRV_SEQ_ID = DRIVER_INFO.DRV_SEQ_ID '
    + 'WHERE STU_SEQ_ID = "' + id + '" '
    , function(err, rows, fields) {
        if (err) throw err
        callback(rows)
    })
}

function getStateDetailBySelected(studentId, schoolId, techId, callback) {
    connection.query('SELECT(CASE WHEN TI.TXN_TYPE = "STUDENT" THEN SI.STU_NAME_TH'
    + ' WHEN TI.TXN_TYPE = "TEACHER" THEN TEI.TECH_NAME END) NAME,'
    + ' IFNULL(DC.CON_VALUE, TI.TXN_STATUS_INFO) AS Status,'
    + ' TI.TXN_CREATE_DATE AS DATE FROM TRANSACTION_INFO TI'
    + ' LEFT JOIN DATA_CONFIG DC ON DC.CON_KEY = CONCAT("MAPPING.",'
    + ' TI.TXN_STATUS_INFO) LEFT JOIN STUDENT_INFO SI ON SI.STU_SEQ_ID ='
    + ' (CASE WHEN(TI.TXN_TYPE = "STUDENT") THEN TI.TXN_TYPE_SEQ_ID END)'
    + ' LEFT JOIN  TEACHER_INFO TEI ON TEI.TECH_SEQ_ID = (CASE WHEN (TI.TXN_TYPE = "TEACHER")'
    + ' THEN TI.TXN_TYPE_SEQ_ID END)'
    + ' WHERE DATE(TI.TXN_CREATE_DATE) = CURRENT_DATE AND (CASE WHEN TI.TXN_TYPE = "STUDENT"'
    + ' THEN TI.TXN_TYPE_SEQ_ID = ' + parseInt(studentId) + ' WHEN TI.TXN_TYPE = "TEACHER"'
    + ' THEN TI.TXN_TYPE_SEQ_ID = ' + parseInt(techId) + ' END) AND TI.TXN_SCH_SEQ_ID = ' + parseInt(schoolId)
    + ' ORDER BY TI.TXN_SEQ_ID DESC'
    , function(err, rows, fields) {
        if (err) throw err
        callback(rows)
    })
}

function getMessageAnnounce(schoolId, callback) {
    connection.query('SELECT * FROM MESSAGE_INFO WHERE DATE(MSG_UPDATE_DATE)'
    + ' BETWEEN DATE_SUB(NOW(), INTERVAL 30 DAY) AND NOW()'
    + ' AND MSG_SCH_SEQ_ID = ' + parseInt(schoolId)
    + ' ORDER BY MSG_SEQ_ID DESC'
    , function(err, rows, fields) {
        if (err) throw err
        callback(rows)
    })
}

function getBusLocation(busId, schoolId, callback) {
    connection.query('SELECT POSB_LATITUDE, POSB_LONGITUDE FROM POSITION_BUS_INFO'
    + ' WHERE POSB_BUS_SEQ_ID = ' + parseInt(busId) + ' AND POSB_SCH_SEQ_ID = ' + parseInt(schoolId)
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

    const data = {
        username: username,
        password: password
    }

    try {
        authenLogin(data, function(response) {
            if (response.length > 0) {
                res.writeHead(200, {'Content-Type': 'application/json'})
                res.end(JSON.stringify(response[0]))
            } else {
                res.writeHead(422, {'Content-Type': 'application/json'})
                res.end(JSON.stringify({ message: 'Invalid username or password.' }))
            }
        })
    } catch(e) {
        res.writeHead(503, {'Content-Type': 'application/json'})
        res.end(JSON.stringify({ message: 'No content.' }))
    }
})

app.post('/updateUser', (req, res) => {
    const username = req.body.username
    const password = req.body.password

    const data = {
        username: username,
        password: password
    }

    try {
        updateUser(data, function(response) {
            if (response) {
                res.writeHead(200, {'Content-Type': 'application/json'})
                res.end(JSON.stringify({ message: 'SUCCESS' }))
            } else {
                res.writeHead(422, {'Content-Type': 'application/json'})
                res.end(JSON.stringify({ message: 'Invalid value' }))
            }
        })
    } catch(e) {
        res.writeHead(503, {'Content-Type': 'application/json'})
        res.end(JSON.stringify({ message: 'No content.' }))
    }
})

app.post('/updateSenderID', (req, res) => {
    const username = req.body.username
    const senderId = req.body.senderId
    const parentId = req.body.parentId
    const schoolId = req.body.schoolId

    const data = {
        username: username,
        senderId: senderId,
        parentId: parentId,
        schoolId: schoolId
    }

    try {
        updateSenderID(data, function(response) {
            if (response) {
                res.writeHead(200, {'Content-Type': 'application/json'})
                res.end(JSON.stringify({ message: 'SUCCESS' }))
            } else {
                res.writeHead(422, {'Content-Type': 'application/json'})
                res.end(JSON.stringify({ message: 'Invalid value' }))
            }
        })
    } catch(e) {
        res.writeHead(503, {'Content-Type': 'application/json'})
        res.end(JSON.stringify({ message: 'No content.' }))
    }
})

app.delete('/deleteSenderID', (req, res) => {
    const senderId = req.header('senderId')

    try {
        deleteSenderID(senderId, function(response) {
            if(response) {
                res.writeHead(200, {'Content-Type': 'application/json'})
                res.end(JSON.stringify({ message: 'SUCCESS' }))
            } else {
                res.writeHead(422, {'Content-Type': 'application/json'})
                res.end(JSON.stringify({ message: 'Invalid value' }))
            }
        })
    } catch(e) {
        res.writeHead(503, {'Content-Type': 'application/json'})
        res.end(JSON.stringify({ message: 'No content.' }))
    }
})

app.get('/parentDetail', (req, res) => {
    const parentId = req.header('id')

    try {
        getParentDetail(parentId, function(response) {
            res.writeHead(200, {'Content-Type': 'application/json'})
            if (response.length > 0) {
                res.end(JSON.stringify(response[0]))
            } else {
                res.end(JSON.stringify({ }))
            }
        })
    } catch(e) {
        res.writeHead(503, {'Content-Type': 'application/json'})
        res.end(JSON.stringify({ message: 'No content.' }))
    }
})

app.get('/studentList', (req, res) => {
    const parentId = req.header('id')

    try {
        getStudenList(parentId, function(response) {
            res.writeHead(200, {'Content-Type': 'application/json'})
            if (response.length > 0) {
                res.end(JSON.stringify(response))
            } else {
                res.end(JSON.stringify([  ]))
            }
        })
    } catch(e) {
        res.writeHead(503, {'Content-Type': 'application/json'})
        res.end(JSON.stringify({ message: 'No content.' }))
    }
})

app.get('/studentDetail', (req, res) => {
    const studentId = req.header('id')

    try {
        getStudentDetail(studentId, function(response) {
            res.writeHead(200, {'Content-Type': 'application/json'})
            if (response.length > 0) {
                res.end(JSON.stringify(response[0]))
            } else {
                res.end(JSON.stringify({  }))
            }
        })
    } catch(e) {
        res.writeHead(503, {'Content-Type': 'application/json'})
        res.end(JSON.stringify({ message: 'No content.' }))
    }
})

app.get('/stateDetail', (req, res) => {
    const studentId = req.header('studentId')
    const schoolId = req.header('schoolId')
    const techId = req.header('techId')

    try {
        getStateDetailBySelected(studentId, schoolId, techId, function(response) {
            res.writeHead(200, {'Content-Type': 'application/json'}) 
            if (response.length > 0) {
                res.end(JSON.stringify(response))
            } else {
                res.end(JSON.stringify([  ]))
            }
        })
    } catch(e) {
        res.writeHead(503, {'Content-Type': 'application/json'})
        res.end(JSON.stringify({ message: 'No content.' }))
    }
})

app.get('/getAnnounce', (req, res) => {
    const schoolId = req.header('schoolId')
    try {
        getMessageAnnounce(schoolId, function(response) {
            res.writeHead(200, {'Content-Type': 'application/json'})
            if(response.length > 0) {
                res.end(JSON.stringify(response))
            } else {
                res.end(JSON.stringify([  ]))
            }
        })
    } catch(e) {
        res.writeHead(503, {'Content-Type': 'application/json'})
        res.end(JSON.stringify({ message: 'No content.' }))
    }
})

app.get('/getBusLocation', (req, res) => {
    const busId = req.header('busId')
    const schoolId = req.header('schoolId')

    try {
        getBusLocation(busId, schoolId, function(response) {
            res.writeHead(200, {'Content-Type': 'application/json'})
            if(response.length > 0) {
                res.end(JSON.stringify(response[0]))
            } else {
                res.end(JSON.stringify({ }))
            }
        })
    } catch(e) {
        res.writeHead(503, {'Content-Type': 'application/json'})
        res.end(JSON.stringify({ message: 'No content.' }))
    }
})
