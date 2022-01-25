import subprocess
import json
import re
import yaml

stream = open('_config.yml', 'r')
configData = yaml.load(stream, Loader=yaml.FullLoader)
stream.close()

token = configData["backend"]["token"]
groupname = configData["namespace"]
semester = configData["semester"]

groupid = -1

amt = 1
page = 1

while amt > 0:
  out = subprocess.run(["curl", "https://git-classes.mst.edu/api/v4/groups?access_token=" + token + "&page=" + str(page)], capture_output=True)
  page += 1
  j = json.loads(out.stdout)

  for field in j:
    if field["name"] == groupname:
      groupid = field["id"]
      break
    
  amt = len(j)

if groupid == -1: #Group ID not found  
  exit(1)
  

out = subprocess.run(["curl", "https://git-classes.mst.edu/api/v4/groups/" + str(groupid) + "?access_token=" + token], capture_output=True)

j = json.loads(out.stdout)

projects = []

for project in j["projects"]:  
  if not re.match(semester+"-.-.*-[a-z0-9]+", project["name"]):    
    projects += [project["name"]]
      
projects.sort()
outputstr = ""
for project in projects:
    # print(project)
    outputstr = outputstr + project + ","
print(outputstr[:-1], end='')
