Set-PSDebug -Trace 1

$CIRRUS_REPO_FULL_NAME = 'SonarSource/SonarJS'
$CIRRUS_BUILD_ID = '5678932581416960'

$FUNCTION_URL = 'https://us-central1-ci-cd-215716.cloudfunctions.net'

$r = Invoke-WebRequest -Headers @{'Authorization' = 'Bearer ABCDE' } -URI "$FUNCTION_URL/cirrusBuildNumber/$CIRRUS_REPO_FULL_NAME/$CIRRUS_BUILD_ID"

$BUILD_NUMBER = $r.Content

$CURRENT_VERSION = (mvn.cmd -q '-Dexec.executable="powershell.exe"' '-Dexec.args="-Command Write-Output ${project.version}"' --non-recursive 'org.codehaus.mojo:exec-maven-plugin:1.3.1:exec') | Out-String

$NEW_VERSION = $CURRENT_VERSION.Trim()

$NEW_VERSION -replace "-SNAPSHOT", ".$BUILD_NUMBER"
 
Invoke-Command "mvn.cmd org.codehaus.mojo:versions-maven-plugin:2.7:set -DnewVersion=$NEW_VERSION -DgenerateBackupPoms=false -B -e"


