@Library('SonarSource@2.2') _
pipeline {
  agent {
    label 'linux'
  }
  parameters {
    string(name: 'GIT_SHA1', description: 'Git SHA1 (provided by travisci hook job)')
    string(name: 'CI_BUILD_NAME', defaultValue: 'SonarJS', description: 'Build Name (provided by travisci hook job)')
    string(name: 'CI_BUILD_NUMBER', description: 'Build Number (provided by travisci hook job)')
    string(name: 'GITHUB_BRANCH', defaultValue: 'master', description: 'Git branch (provided by travisci hook job)')
    string(name: 'GITHUB_REPOSITORY_OWNER', defaultValue: 'SonarSource', description: 'Github repository owner(provided by travisci hook job)')
  }
  environment {
    SONARSOURCE_QA = 'true'
    MAVEN_TOOL = 'Maven 3.6.x'
    JDK_VERSION = 'Java 11'
  }
  stages {
    stage('Notify') {
      steps {
        sendAllNotificationQaStarted()
      }
    }
    stage('QA') {
      parallel {
        stage('plugin/DOGFOOD/linux') {
          agent {
            label 'linux'
          }
          steps {
            runITs("plugin","DOGFOOD")
          }
        }     
        stage('plugin/LATEST_RELEASE[6.7]/linux') {
          agent {
            label 'linux'
          }
          steps {
            runITs("plugin","LATEST_RELEASE[6.7]")
          }
        }
        stage('ruling/LATEST_RELEASE/linux') {
          agent {
            label 'linux'
          }
          steps {
            runITs("ruling","LATEST_RELEASE")            
          }
        }                       


        stage('plugin/LATEST_RELEASE[6.7]/windows') {
          agent {
            label 'windows'
          }
          steps {
            install_nodejs_win()
            runITs("plugin","LATEST_RELEASE")
          }
        }
        stage('ci/windows') {
          agent {
            label 'windows'
          }
          steps {
            install_nodejs_win()
            runMaven("clean package")
          }
        }
      }         
      post {
        always {
          sendAllNotificationQaResult()
        }
      }

    }
    stage('Promote') {
      steps {
        repoxPromoteBuild()
      }
      post {
        always {
          sendAllNotificationPromote()
        }
      }
    }
  }
}

def runITs(TEST,SQ_VERSION) {    
  withMaven(maven: MAVEN_TOOL) {
    mavenSetBuildVersion()        
    dir("its/$TEST") {    
      runMavenOrch(JDK_VERSION,"verify -Dsonar.runtimeVersion=$SQ_VERSION")
    }
  }
}


def install_nodejs_win() {
  #install npm
  sh '''
  node_home=$(pwd)/node-v8.9.0-win-x64
  node_archive=node.7z
  if [ ! -d "$node_home" ]; then
    echo "=== Install Node.js ===";
    curl --insecure --silent --show-error -o $node_archive https://nodejs.org/dist/v8.9.0/node-v8.9.0-win-x64.7z;
    7z x $node_archive;
    rm $node_archive;
  fi

  chmod 755 $node_home/node;

  export PATH=$node_home:$PATH;

  echo "Node version"
  node -v
  '''
}