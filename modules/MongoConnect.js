const MongoClient = require('mongodb').MongoClient;
let db;
MongoClient.connect("mongodb+srv://igorek:O72hNe0NzyGtsZBD@cluster0.q5fad.mongodb.net/myFirstDatabase?retryWrites=true&w=majority", {
    useNewUrlParser: true,
    authSource: "admin",
    useUnifiedTopology: true
}, function(err, database) {
    if (err) {
        console.error('An error occurred connecting to MongoDB: ', err);
    } else {
        db = database.db("antiFraud");
    }
});

module.exports = function() {
    return db;
};