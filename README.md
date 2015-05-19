### Summary
This is a simple replication of the *server* file system, using url references to files.

### Requirements:
* [NodeJS](https://nodejs.org/download/)
* [Git](https://git-scm.com/downloads)

### How To Install
* Clone this [repo](https://github.com/ryancrosser/persistence.git)
* Run:
        npm install

### How to Start the Server
    npm start

### How to Use the Persistence Service
Files can be referenced at **/api/resources/123**.  
A helper method has been included to reference files by name, **/api/resources/angular.js?name**.

To automatically include files into Persistence, place files in **src/to_persist** before the server boots up. The server is designed to only add files that have not already been added. When processed, the files are added to **src/server/data/resources** and referenced through the SQLite database at **src/server/data/resources.sql**.

Included in this project is a FileIO Service (**src/client/app/common/jema**) that will perform CRUD operations from the client side, and save into Persistence.
