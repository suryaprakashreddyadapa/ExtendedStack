var express = require('express');
var router = express.Router();
var OSWrap = require('openstack-wrapper');

var keyStoneUrlPortAndPath = 'http://localhost:5000/v3';
var glanceUrlPortAndPath = 'http://localhost:9292/v2';
var neutronUrlPortAndPath = 'http://localhost:9696/v2.0';
var novaURL = null;

var keystoneTokenObject = null;
var keystoneTokenString = null;
var projectObject = null;
var projectToken = null;

/* GET  Login page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

/* POST to add new user to db */
router.post('/loginUser', function(req, res) {
  var username = req.body.username;
  var password = req.body.password;
 // var host = req.body.hostValue;

  var keyStoneURL = keyStoneUrlPortAndPath;//"http://"+host+keyStoneUrlPortAndPath;
  console.log(" Username ="+username+" Password ="+password);
  var keystone = new OSWrap.Keystone(keyStoneURL);
  console.log(" keyStoneURL ="+keyStoneURL);
  keystone.getToken(username, password, function(keyStoneError, authToken){
    if(keyStoneError) {
      console.error('an error occured', keyStoneError);
      res.render('error', { 'errorObject': keyStoneError });
    } else {
      console.log('A general token object has been retrived', authToken);
      keystoneTokenObject = authToken;
      //the project token contains all kinds of project information
      //including endpoint urls for each of the various systems (Nova, Neutron, Glance)
      //and the token value (project_token.token) required for instantiating all non Keystone Objects
      //see the openstack docs for more specifics on the return format of this object (or print it out I suppose)

      keystoneTokenString = authToken.token;

      // Retrive Compute(Nova) URL
      if (authToken.hasOwnProperty('catalog')) {
          var catalogs = authToken.catalog;
          catalogs.forEach(function (catalog) {
            if (catalog.name == 'nova') {
               var endpoints = catalog.endpoints;
               var firstEndpoint = endpoints[0];
               novaURL = firstEndpoint.url;
               if (novaURL != null) {
                  novaURL = novaURL.replace("controller", "localhost");
               }
               console.log(' --- Got the nova end point');
            }
          });
      }


      if (authToken.hasOwnProperty('project')) {
        projectObject = authToken.project;
        console.error('Project ='+ projectObject.name);
        keystone.getProjectToken(keystoneTokenString, projectObject.id, function(error, project_token){
          if(error) {
            console.error('an error occured', error);
          } else {
            console.log('A project specific token has been retrived', project_token);
            projectToken = project_token;
            res.render('Home', { 'token' : keystoneTokenString, 'project' : projectObject, 'projectToken' : projectToken.token });
          }
        });
      } else {
        console.log('-----Project not defined');
        res.render('Home', { 'token' : keystoneTokenString, 'project' : '', 'projectToken' : '' });
      }
    }
  });
});


/* GET Servers page. */
router.get('/viewServers', function(req, res) {
  // res.render('viewServers',{'servers': [] });

  // var novaURL = 'http://localhost:8774/v2.1/e163803e6e154f88b188e641fe346529';//"http://"+host+keyStoneUrlPortAndPath;
  // console.log(" novaURL ="+novaURL);

  var nova = new OSWrap.Nova(novaURL, keystoneTokenString);
  var neutron = new OSWrap.Neutron(neutronUrlPortAndPath, keystoneTokenString);
  var glance = new OSWrap.Glance(glanceUrlPortAndPath, keystoneTokenString);

  console.log(" novaURL1 ="+novaURL);

  nova.listServers(function(error, servers_array){
    if(error)
    {
      console.error('an error occured', error);
      res.render('error', { 'errorObject': error });
    }
    else
    {
      neutron.listSecurityGroups(projectObject.id,function(error, securityGroups_array){
        neutron.listNetworks(function(error, networks_array){
          nova.listFlavors(function(error, flavors_array){
            glance.listImages(function(error, images_array){
              res.render('viewServers',{'servers':servers_array,'flavors':flavors_array,'images':images_array,'networks':networks_array,'securityGroups':securityGroups_array});
            });
          });
        });
      });
    }
  });
});


/* GET Flavors page. */
router.get('/viewFlavors', function(req, res) {
  // res.render('viewServers',{'servers': [] });

  // var novaURL = 'http://localhost:8774/v2.1/e163803e6e154f88b188e641fe346529';//"http://"+host+keyStoneUrlPortAndPath;
  // console.log(" novaURL ="+novaURL);

  var nova = new OSWrap.Nova(novaURL, keystoneTokenString);
  console.log(" novaURL1 ="+novaURL);

  nova.listFlavors(function(error, flavors_array){
    if(error)
    {
      console.error('an error occured', error);
      res.render('error', { 'errorObject': error });
    }
    else
    {
      console.log('A list of flavors have been retrived', flavors_array);
      console.log('------ YES Retrieved '+flavors_array);
      res.render('viewFlavors',{'flavors':flavors_array});
    }
  });
});


/* GET Network page. */
router.get('/viewNetworks', function(req, res) {
  console.log(" neutronURL ="+neutronUrlPortAndPath);

  var neutron = new OSWrap.Neutron(neutronUrlPortAndPath, keystoneTokenString);
  console.log(" neutronURL ="+neutronUrlPortAndPath);

  neutron.listNetworks(function(error, networks_array){
    if(error)
    {
      console.error('an error occured', error);
      res.render('error', { 'errorObject': error });
    }
    else
    {
      console.log('A list of servers have been retrived', networks_array);
      console.log('------ YES Retrieved '+networks_array);
      res.render('viewNetworks',{'networks':networks_array});
    }
  });
});

/* GET Security Group page. */
router.get('/viewSecurityGroups', function(req, res) {
  console.log(" neutronURL ="+neutronUrlPortAndPath);

  var neutron = new OSWrap.Neutron(neutronUrlPortAndPath, keystoneTokenString);
  console.log(" neutronURL ="+neutronUrlPortAndPath);

  neutron.listSecurityGroups(projectObject.id,function(error, securityGroups_array){
    if(error)
    {
      console.error('an error occured', error);
      res.render('error', { 'errorObject': error });
    }
    else
    {
      console.log('A list of securityGroups have been retrived', securityGroups_array);
      res.render('viewSecurityGroups',{'securityGroups':securityGroups_array});
    }
  });
});


/* GET Image page. */
router.get('/viewImages', function(req, res) {
  console.log(" glanceURl ="+glanceUrlPortAndPath);

  var glance = new OSWrap.Glance(glanceUrlPortAndPath, keystoneTokenString);
  console.log(" glanceURl ="+glanceUrlPortAndPath);

  glance.listImages(function(error, images_array){
    if(error)
    {
      console.error('an error occured', error);
      res.render('error', { 'errorObject': error });
    }
    else
    {
      console.log('A list of servers have been retrived', images_array);
      console.log('------ YES Retrieved '+images_array);
      res.render('viewImages',{'images':images_array});
    }
  });
});


/* GET Token page. */
router.get('/viewTokens', function(req, res) {
  res.render('viewTokens', { 'token' : keystoneTokenString, 'project' : projectObject, 'projectToken' : projectToken.token });

});

/* GET Home page. */
router.get('/Home', function(req, res) {
  res.render('Home', { 'token' : keystoneTokenString, 'project' : projectObject, 'projectToken' : projectToken.token });

});



  /* Creating Security Group */
router.post('/createSecurityGroup', function(req, res) {
	var name=req.body.create;

  console.log(" neutronURL ="+neutronUrlPortAndPath);
  var neutron = new OSWrap.Neutron(neutronUrlPortAndPath, keystoneTokenString);
  console.log(" neutronURL ="+neutronUrlPortAndPath);
  var data_object= {"security_group":{"name": "testsecurity",
                  "description":"security group for testing"
                  }};
  neutron.createSecurityGroup(name, data_object, function(error, data){
  if(error)
    {
      console.error('an error occured', error);
      res.render('error', { 'errorObject': error });
    }
  else
    {
      console.log('A security group is created',data );
      console.log('------ YES Retrieved '+data);

	  neutron.listSecurityGroups(projectObject.id,function(error, securityGroups_array){
	//  neutron.listSecurityGroups(function(error,securityGroups_array){
		if(error)
        {
          console.error('an error occured', error);
          res.render('error', { 'errorObject': error });
        }
        else
        {
          console.log('A list of securitygroups have been retrived', securityGroups_array);
          res.render('viewSecurityGroups',{'securityGroups':securityGroups_array});
        }
	  })
   }
   });
  });


//For Managing Security Rules
router.get('/manageSecurityGroup', function(req, res) {
  console.log(" neutronURL ="+neutronUrlPortAndPath);
	var id=req.body.mid;
	console.log("ID is  jjsfdvvjhhvdf jsafvhahsvfm javsfjvasjf jjasvfjvasf jvcjcsjfasjfb= ");

  var neutron = new OSWrap.Neutron(neutronUrlPortAndPath, keystoneTokenString);
  console.log(" neutronURL ="+neutronUrlPortAndPath);
console.log("ID1 is = "+id);

  neutron.getSecurityGroupRules(id, function(error, securityGroupRules_array){
    if(error)
    {
      console.error('an error occured', error);
      res.render('error', { 'errorObject': error });
    }
    else
    {
      console.log('A list of securityGroups have been retrived', securityGroupRules_array);
      res.render('viewSecurityGroupsRules',{'securityGroupRules':securityGroupRules_array});
	console.log("ID1 is = "+id);
    }
  });
});






/* Delete Security Group */
router.post('/deleteSecurityGroup', function(req, res) {

 //var name=req.body.name;
  var id=req.body.id;
  console.log(" neutronURL ="+neutronUrlPortAndPath);
  var neutron = new OSWrap.Neutron(neutronUrlPortAndPath, keystoneTokenString);
  console.log(" neutronURL ="+neutronUrlPortAndPath);


  neutron.removeSecurityGroup(id, function(error){
  if(error)
    {
      console.error('an error occured', error);
      res.render('error', { 'errorObject': error });
    }
  else
    {
      console.log('A security group is deleted');
      console.log('------ YES deleted ');

	  neutron.listSecurityGroups(projectObject.id,function(error, securityGroups_array){
	   if(error)
        {
          console.error('an error occured', error);
          res.render('error', { 'errorObject': error });
        }
        else
        {
          console.log('A list of securitygroups have been retrived after deletion', securityGroups_array);
          res.render('viewSecurityGroups',{'securityGroups':securityGroups_array});
        }
	  })
   }
   });
  });


/* GET user page. */
router.post('/createServer', function(req, res) {
  var nova = new OSWrap.Nova(novaURL, keystoneTokenString);
  console.log(" novaURL =----",req.body);

  // nova.listServers(function(error, servers_array){
  //   if(error)
  //   {
  //     console.error('an error occured', error);
  //     res.render('error', { 'errorObject': error });
  //   }
  //   else
  //   {
  //     // console.log('A list of servers have been retrived', servers_array);
  //     res.render('viewServers1',{'servers':servers_array});
  //   }
  // });

  var instanceName = req.body.instanceName;
  var imageRef = req.body.selectedImage;
  var flavorRef = req.body.selectedFlavor;
  var networkId = req.body.selectedNetwork;


  var data_Object = {
    'server':{
      'name':instanceName,
      'imageRef':imageRef,
      'flavorRef':flavorRef,
      'max_count':1,
      'min_count':1,
      'networks':[{'uuid':networkId}],
      "security_groups": [{"name": "default"}]
    }
  };




  nova.createServer(data_Object,function(error, data){
    if(error)
    {
      console.error('an error occured', error);
      res.render('error', { 'errorObject': error });
    }
    else
    {
      console.log('------ YES created the server '+data);
      nova.listServers(function(error, servers_array){
        if(error)
        {
          console.error('an error occured', error);
          res.render('error', { 'errorObject': error });
        }
        else
        {
          console.log('A list of servers have been retrived', servers_array);
          res.redirect('viewServers');
        }
      });
    }
  });
});






module.exports = router;
