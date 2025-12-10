const express = require('express')
const path = require('path')

const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')

const {open} = require('sqlite')
const sqlite3 = require('sqlite3')

const dbpath = path.join(__dirname, 'twitterClone.db')

const app = express()
app.use(express.json())

let db = null
const JWT_SECRET = 'MOULIDHAR'

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbpath,
      driver: sqlite3.Database,
    })

    app.listen(3000, () => {
      console.log('Server is running at http://localhost:3000/')
    })
  } catch (e) {
    console.log(`DB Error: ${e.message}`)
    process.exit(1)
  }
}

initializeDBAndServer()

// Helper: get user record by username

const getUserByUsername = async username => {
  const query = `SELECT * FROM user WHERE username = ?`
  return await db.get(query, [username])
}

/*
  API 1: Register
  POST /register/
*/

app.post('/register/', async (request, response) => {
  try {
    const {username, password, name, gender} = request.body

    const dbUser = await getUserByUsername(username)

    if (dbUser !== undefined) {
      response.status(400)
      response.send('User already exists')
      return
    }

    if (password.length < 6) {
      response.status(400)
      response.send('Password is too short')
      return
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const insertQuery = `
      INSERT INTO user (name, username, password, gender)
      VALUES (?, ?, ?, ?);
    `
    await db.run(insertQuery, [name, username, hashedPassword, gender])
    response.send('User created successfully')
  } catch (err) {
    console.error(err)
    response.status(500).send('Server error')
  }
})

/*
  API 2: Login
  POST /login/
*/
app.post('/login/', async (request, response) => {
  try {
    const {username, password} = request.body
    const dbUser = await getUserByUsername(username)
    if (dbUser === undefined) {
      response.status(400)
      response.send('Invalid user')
      return
    }

    const passwordMatches = await bcrypt.compare(password, dbUser.password)
    if (!passwordMatches) {
      response.status(400)
      response.send('Invalid password')
      return
    }

    const payload = {username: dbUser.username}
    const jwtToken = jwt.sign(payload, JWT_SECRET)
    response.send({jwtToken})
  } catch (err) {
    console.error(err)
    response.status(500).send('Server error')
  }
})

/*
  Authentication middleware (JWT)
*/
const authenticationToken = (request, response, next) => {
  const authHeader = request.headers['authorization']
  if (!authHeader) {
    response.status(401)
    response.send('Invalid JWT Token')
    return
  }
  const token = authHeader.split(' ')[1]
  if (!token) {
    response.status(401)
    response.send('Invalid JWT Token')
    return
  }
  jwt.verify(token, JWT_SECRET, (err, payload) => {
    if (err) {
      response.status(401)
      response.send('Invalid JWT Token')
    } else {
      request.username = payload.username
      next()
    }
  })
}

/*
  Utility: get current logged-in user record
*/
const getCurrentUser = async username => {
  const query = `SELECT * FROM user WHERE username = ?`
  return await db.get(query, [username])
}

/*
  API 3: GET /user/tweets/feed/
  Returns latest tweets from people the user follows, 4 at a time
*/
app.get(
  '/user/tweets/feed/',
  authenticationToken,
  async (request, response) => {
    try {
      const username = request.username
      const user = await getCurrentUser(username)

      const getTweetsQuery = `
      SELECT
        u.username AS username,
        t.tweet AS tweet,
        t.date_time AS dateTime
      FROM follower f
      INNER JOIN tweet t ON f.following_user_id = t.user_id
      INNER JOIN user u ON t.user_id = u.user_id
      WHERE f.follower_user_id = ?
      ORDER BY t.date_time DESC
      LIMIT 4;
    `
      const tweets = await db.all(getTweetsQuery, [user.user_id])
      response.send(tweets)
    } catch (err) {
      console.error(err)
      response.status(500).send('Server error')
    }
  },
)

/*
  API 4: GET /user/following/
  Returns list of names the user is following
*/
app.get('/user/following/', authenticationToken, async (request, response) => {
  try {
    const username = request.username
    const user = await getCurrentUser(username)

    const query = `
      SELECT u.name
      FROM follower f
      INNER JOIN user u ON u.user_id = f.following_user_id
      WHERE f.follower_user_id = ?;
    `
    const followingList = await db.all(query, [user.user_id])
    response.send(followingList)
  } catch (err) {
    console.error(err)
    response.status(500).send('Server error')
  }
})

/*
  API 5: GET /user/followers/
  Returns list of names who follow the user
*/
app.get('/user/followers/', authenticationToken, async (request, response) => {
  try {
    const username = request.username
    const user = await getCurrentUser(username)

    const query = `
      SELECT u.name
      FROM follower f
      INNER JOIN user u ON u.user_id = f.follower_user_id
      WHERE f.following_user_id = ?;
    `
    const followersList = await db.all(query, [user.user_id])
    response.send(followersList)
  } catch (err) {
    console.error(err)
    response.status(500).send('Server error')
  }
})

/*
  Helper: check if current user follows authorId
*/
const isFollowing = async (currentUserId, authorId) => {
  const query = `
    SELECT * FROM follower
    WHERE follower_user_id = ? AND following_user_id = ?
  `
  const row = await db.get(query, [currentUserId, authorId])
  return row !== undefined
}

/*
  API 6: GET /tweets/:tweetId/
  If the tweet is by someone the current user follows, return tweet, likes, replies, dateTime
*/
app.get('/tweets/:tweetId/', authenticationToken, async (request, response) => {
  try {
    const {tweetId} = request.params
    const user = await getCurrentUser(request.username)

    const tweetQuery = `SELECT * FROM tweet WHERE tweet_id = ?`
    const tweet = await db.get(tweetQuery, [tweetId])

    if (!tweet) {
      // Not found: treat as invalid request per spec (401 for unauthorized request)
      response.status(401).send('Invalid Request')
      return
    }

    const follows = await isFollowing(user.user_id, tweet.user_id)
    if (!follows) {
      response.status(401).send('Invalid Request')
      return
    }

    const likesQuery = `SELECT COUNT(*) AS likesCount FROM "like" WHERE tweet_id = ?`
    const likesRow = await db.get(likesQuery, [tweetId])
    const repliesQuery = `SELECT COUNT(*) AS repliesCount FROM reply WHERE tweet_id = ?`
    const repliesRow = await db.get(repliesQuery, [tweetId])

    response.send({
      tweet: tweet.tweet,
      likes: likesRow.likesCount,
      replies: repliesRow.repliesCount,
      dateTime: tweet.date_time,
    })
  } catch (err) {
    console.error(err)
    response.status(500).send('Server error')
  }
})

/*
  API 7: GET /tweets/:tweetId/likes/
  If tweet's author is followed by current user, return list of usernames who liked
*/
app.get(
  '/tweets/:tweetId/likes/',
  authenticationToken,
  async (request, response) => {
    try {
      const {tweetId} = request.params
      const user = await getCurrentUser(request.username)

      const tweet = await db.get(`SELECT * FROM tweet WHERE tweet_id = ?`, [
        tweetId,
      ])
      if (!tweet) {
        response.status(401).send('Invalid Request')
        return
      }

      const follows = await isFollowing(user.user_id, tweet.user_id)
      if (!follows) {
        response.status(401).send('Invalid Request')
        return
      }

      // table name "like" is a reserved word — use double quotes around it in SQL
      const likesQuery = `
      SELECT u.username
      FROM "like" l
      INNER JOIN user u ON l.user_id = u.user_id
      WHERE l.tweet_id = ?;
    `
      const rows = await db.all(likesQuery, [tweetId])
      const usernames = rows.map(r => r.username)
      response.send({likes: usernames})
    } catch (err) {
      console.error(err)
      response.status(500).send('Server error')
    }
  },
)

/*
  API 8: GET /tweets/:tweetId/replies/
  If tweet's author is followed by current user, return list of replies with replier name and reply
*/
app.get(
  '/tweets/:tweetId/replies/',
  authenticationToken,
  async (request, response) => {
    try {
      const {tweetId} = request.params
      const user = await getCurrentUser(request.username)

      const tweet = await db.get(`SELECT * FROM tweet WHERE tweet_id = ?`, [
        tweetId,
      ])
      if (!tweet) {
        response.status(401).send('Invalid Request')
        return
      }

      const follows = await isFollowing(user.user_id, tweet.user_id)
      if (!follows) {
        response.status(401).send('Invalid Request')
        return
      }

      const repliesQuery = `
      SELECT u.name AS name, r.reply AS reply
      FROM reply r
      INNER JOIN user u ON r.user_id = u.user_id
      WHERE r.tweet_id = ?;
    `
      const rows = await db.all(repliesQuery, [tweetId])
      response.send({replies: rows})
    } catch (err) {
      console.error(err)
      response.status(500).send('Server error')
    }
  },
)

/*
  API 9: GET /user/tweets/
  Returns list of all tweets of the logged-in user with likes, replies and dateTime
*/
app.get('/user/tweets/', authenticationToken, async (request, response) => {
  try {
    const user = await getCurrentUser(request.username)

    const query = `
      SELECT
        t.tweet AS tweet,
        COUNT(DISTINCT l.like_id) AS likes,
        COUNT(DISTINCT r.reply_id) AS replies,
        t.date_time AS dateTime
      FROM tweet t
      LEFT JOIN "like" l ON t.tweet_id = l.tweet_id
      LEFT JOIN reply r ON t.tweet_id = r.tweet_id
      WHERE t.user_id = ?
      GROUP BY t.tweet_id
      ORDER BY t.date_time DESC;
    `
    const rows = await db.all(query, [user.user_id])
    response.send(rows)
  } catch (err) {
    console.error(err)
    response.status(500).send('Server error')
  }
})

/*
  API 10: POST /user/tweets/
  Create a tweet
  Request body: { "tweet": "The Mornings..." }
*/
app.post('/user/tweets/', authenticationToken, async (request, response) => {
  try {
    const {tweet} = request.body
    const user = await getCurrentUser(request.username)

    const insertQuery = `
      INSERT INTO tweet (tweet, user_id, date_time)
      VALUES (?, ?, datetime('now'))
    `
    await db.run(insertQuery, [tweet, user.user_id])
    response.send('Created a Tweet')
  } catch (err) {
    console.error(err)
    response.status(500).send('Server error')
  }
})

/*
  API 11: DELETE /tweets/:tweetId/
  If tweet belongs to the logged-in user, delete it; otherwise 401 Invalid Request
*/
app.delete(
  '/tweets/:tweetId/',
  authenticationToken,
  async (request, response) => {
    try {
      const {tweetId} = request.params
      const user = await getCurrentUser(request.username)

      const tweet = await db.get(`SELECT * FROM tweet WHERE tweet_id = ?`, [
        tweetId,
      ])
      if (!tweet) {
        response.status(401).send('Invalid Request')
        return
      }

      if (tweet.user_id !== user.user_id) {
        response.status(401).send('Invalid Request')
        return
      }

      await db.run(`DELETE FROM tweet WHERE tweet_id = ?`, [tweetId])
      // Optionally also delete likes/replies associated - dependent on DB constraints. We'll attempt to delete them as well.
      await db.run(`DELETE FROM "like" WHERE tweet_id = ?`, [tweetId])
      await db.run(`DELETE FROM reply WHERE tweet_id = ?`, [tweetId])

      response.send('Tweet Removed')
    } catch (err) {
      console.error(err)
      response.status(500).send('Server error')
    }
  },
)

/*
  Export the express app (CommonJS default export)
*/
module.exports = app
