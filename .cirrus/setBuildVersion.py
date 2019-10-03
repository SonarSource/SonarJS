import subprocess
import sys
import os

def getProjectVersion():
  p = subprocess.Popen(["mvn help:evaluate -Dexpression=project.version"], shell=True,
      stdout = subprocess.PIPE,
      stderr = subprocess.PIPE)
  out,err = p.communicate()
  for line in out.decode().split('\n'):
    if not "INFO" in line and not "WARNING" in line and not "Download" in line:
      return line

def setProjectVersion(version):
  print("Build version is "+version)
  p = subprocess.Popen(["mvn org.codehaus.mojo:versions-maven-plugin:2.5:set -DnewVersion={version}".format(version=version)], shell=True,
      stdout = subprocess.PIPE,
      stderr = subprocess.PIPE)
  out,err = p.communicate()
  #write version to a file for burgr notification
  f = open("version.txt", "w")
  f.write(version)
  f.close()
  #for line in out.decode().split('\n'):
  #  print(line)      


currentVersion=getProjectVersion()
snapshot="-SNAPSHOT"

if not snapshot in currentVersion:
    sys.exit()

releaseVersion = currentVersion.replace(snapshot,'')
digitSeparatorCount = releaseVersion.count('.')
buildNumber = os.environ['BUILD_NUMBER']

while digitSeparatorCount < 2:
    releaseVersion += '.0'
    digitSeparatorCount+=1

releaseVersion += "." + buildNumber

setProjectVersion(releaseVersion)

      