const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const bodyparse = require('body-parser');
const  mongoose = require('mongoose');
const uri = process.env.MONGO_URI;
mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
        .then(() => {
          console.log("Connection state: " + mongoose.connection.readyState);
});
app.use(cors())
app.use(express.static('public'));
app.use(bodyparse.urlencoded({extended : false}));
app.use(express.urlencoded({ extended: true }));


const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  count: { type : Number, required : true },
  log: [{
    description: {type: String, required: true},
    duration: {type: Number, required: true},
    date: { type: String, default: new Date().toDateString() },
  },],
})
const User = mongoose.model('User', userSchema);

app.use(({ method, url, query, params, body }, res, next) => {
  console.log('>>> ', method, url);
  console.log(' QUERY:', query);
  console.log(' PRAMS:', params);
  console.log('  BODY:', body);
  const _json = res.json;
  res.json = function (data) {
    console.log(' RESLT:', JSON.stringify(data, null, 2));
    return _json.call(this, data);
  };
  console.log(' ----------------------------');
  next();
});

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.get('/api/users', async function(req,res){
  User.find({}, "_id username", function(err, users){
    console.log(users);
    if (err) {
      console.log(err);
    } else {
      res.json(users);
    }
  });
});

app.get('/api/users/:_id/logs', async function(req,res){
  await User.findOne(
    {
    _id: req.params._id,
    },
    "_id username count log",
     function(err, data){
    if(err || data === null){
      console.log(err);
      res.json({ 'get': 'fucked'});
    } else {
      var obj = {
        username: data.username,
        count: data.count,
        _id: data._id,
        log: [],
      };
      let from = new Date(req.query.from);
      let to = new Date(req.query.to);
      let limit = parseInt(req.query.limit);
      let counter = 0;

      for (let i = 0; i < data.log.length; i++){
        let actualDate = new Date(data.log[i].date);
        console.log(actualDate);
        console.log(to);
        console.log(to >= actualDate);
        if(
          ((req.query.to &&
            req.query.from &&
            actualDate >= from &&
            actualDate <= to) ||
            (req.query.to && !req.query.from && actualDate <= to) ||
            (!req.query.to && req.query.from && actualDate >= from) ||
            (!req.query.to && !req.query.from)) && 
            ((req.query.limit && counter < limit) || !req.query.limit)
        ) {
          console.log(new Date(data.log[i].date).toDateString());
          obj.log.push({
            description: data.log[i].description,
            duration: Number(data.log[i].duration),
            date: new Date(data.log[i].date).toDateString(),
          });
          counter++;
        }
      }
      obj.count = Number(counter);
      res.json(obj);

    }
  }).clone();
});

app.post('/api/users', function(req,res){
//  console.log(req.body.username);
  const user = new User({
    username: req.body.username,
    count: 0,
  });
  user.save(function(err,user){
    if(err){
      return console.log(err);
    }
    console.log("User created");
  });
  res.json({ 
    username : req.body.username ,
    _id : user._id 
    });
});

app.post("/api/users/:_id/exercises", async function (req, res) {
  let idFound = await User.findOne({
    _id: req.params._id,
  });
  console.log(Date.parse("asdasd"));

  if (idFound) {
    //Push new data into the array
    if (req.body.date === "" || !req.body.date || req.body.date === undefined ) {
      idFound.log.push({
        description: req.body.description,
        duration: Number(req.body.duration),
        date: new Date().toDateString(),
      });
    } else {
      if (isNaN(Date.parse(req.body.date))) {
        return res.json({
          error: "Invalid date",
        });
      } else {
        idFound.log.push({
          description: req.body.description,
          duration: Number(req.body.duration),
          date: new Date(req.body.date).toDateString(),
        });
      }
    }

    //Update the array (this was pushed in the code above)
    User.findByIdAndUpdate(
      idFound._id,
      {
        count: Number(idFound.log.length),
        log: idFound.log,
      },
      function (err, user) {
        if (err) {
          console.log(err);
        } else {
          console.log("User activity has been updated.");
          res.json({
            username: idFound.username,
            description: req.body.description,
            duration: Number(req.body.duration),
            _id: idFound._id,
            date:
              req.body.date === "" || !req.body.date
                ? new Date().toDateString()
                : new Date(req.body.date).toDateString(),
          });
        }
      }
    );
  } else {
    res.json({
      error: "ID not found",
    });
  }
});


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
