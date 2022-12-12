const express = require("express");

const {open} = require("sqlite");
const sqlite3 = require("sqlite3");

const app = express();
app.use(express.json());

const path = require("path");
const dataPath = path.join(__dirname, "covid19india.db");

let database = null;

const initializeDBAndServer = async() => {
    try{
        database = await open({
            filename: dataPath,
            driver: sqlite3.Database
        });
        app.listen(3000, () => 
            console.log("Server running on http://localhost:3000");
        );
    }catch(error){
        console.log(`DB Error: ${error.message}`);
        process.exit(1);
    }
};

initializeDBAndServer();

const convertSnakeCaseToCamelCase = (dataObject) => {
    return{
        stateId: dataObject.state_id,
        stateName: dataObject.state_name,
        population: dataObject.population,
    };
};

const convertSnakeCaseToDistrict = (dataObject) => {
    return{
        districtId: dataObject.district_id,
        districtName: dataObject.district_name,
        stateId: dataObject.state_id,
        cases: dataObject.cases,
        cured: dataObject.cured,
        active: dataObject.active,
        deaths: dataObject.deaths,
    }   
} 

const getTotalCasesOutput = (dataObject) => {
    return{
        totalCases: dataObject."SUM(cases)",
        totalCured: dataObject."SUM(cured)",
        totalActive: dataObject."SUM(active)",
        totalDeaths: dataObject."SUM(deaths)"
    }
}

//get state details

app.get("/states/", async(request,response) => {
    const statesQuery = 
            `SELECT *
             FROM state;`
    const statesDetails = await database.all(statesQuery);
    const camelCaseDetails = statesDetails.map((eachOne) => convertSnakeCaseToCamelCase(eachOne));  
    response.send(camelCaseDetails);
});

//get stateID

app.get("/states/:stateId/", async(request,response) => {
    const {stateId} = request.params;
    const stateIdQuery = 
            `SELECT *
             FROM state
             WHERE state_id =  ${stateId};`;
    const stateDetails = await database.get(stateIdQuery);
    response.send(convertSnakeCaseToCamelCase(stateDetails));
});

//Post Districts

app.post("/districts/", async(request,response) => {
    const {districtName,stateId,cases,cured,active,deaths} = request.body;
    const postQuery = 
            `INSERT INTO 
                    district (district_name,state_id,cases,cured,active,deaths)
             VALUES 
                    ('${districtName}',${stateId},${cases},${cured},${active},${deaths});`;
    const postDetails = await database.run(postQuery);
    response.send("District Successfully Added");
});

//get one District

app.get("/districts/:districtId/", async(request,response) => {
    const {districtId} = request.params;
    const districtIdQuery = 
            `SELECT *
             FROM district
             WHERE district_id =  ${districtId};`;
    const districtDetails = await database.get(districtIdQuery);
    response.send(convertSnakeCaseToDistrict(districtDetails));
});

app.delete("/districts/:districtId/", asyc(request,response) => {
    const {districtId} = request.params;
    const deleteQuery = 
            `DELETE FROM
                district
            WHERE 
                district_id = ${districtId};`;
    const deleteDistrict = await database.run(deleteQuery);
    response.send("District Removed");
});

//put district

app.put("/districts/:districtId/", async(request,response) => {
    const {districtName,stateId,cases,cured,active,deaths} = request.body;
    const {districtId} = request.params;
    const updateQuery = 
            `UPDATE
                district
             SET 
                district_name = '${districtName}',
                state_id = ${stateId},
                cases = ${cases},
                cured = ${cured},
                active = ${active},
                deaths = ${deaths}
            WHERE 
                district_id = ${districtId}`;
    const updateDetails = await database.run(updateQuery);
    response.send("District Details Updated");
});

//get total Cases

app.get("/states/:stateId/stats/", async(request,response) => {
    const {stateId} = request.params;
    const getTotalStatsQuery = 
                `SELECT 
                    SUM(cases),
                    SUM(cured),
                    SUM(active),
                    SUM(deaths)
                 FROM district
                 WHERE 
                    state_id = ${stateId};`;
    const getCasesDetails = await database.get(getTotalStatsQuery);
    response.send(getTotalCasesOutput(getCasesDetails));
});

// GET state Name

app.get("/districts/:districtId/details/", async(request,response) => {
    const {districtId} = request.params;
    const stateNameQuery = 
        `SELECT state.state_name
         FROM state INNER JOIN district
            ON state.state_id = district.state_id
        WHERE district_id = ${districtId};`;
    const getOutput = await database.get(stateNameQuery);
    response.send(getOutput);
})

module.exports = app;
