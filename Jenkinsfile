pipeline {
    agent any

    environment {
        DOCKER_REGISTRY = 'your-account-id.dkr.ecr.eu-central-1.amazonaws.com'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Code Quality (SonarQube)') {
            steps {
                script {
                    // Requires SonarQube plugin configured in Jenkins
                    def scannerHome = tool 'SonarScanner'
                    withSonarQubeEnv('SonarQubeServer') {
                        sh "${scannerHome}/bin/sonar-scanner -Dsonar.projectKey=cloudmart -Dsonar.sources=."
                    }
                }
            }
        }

        stage('Build Docker Images') {
            steps {
                script {
                    def services = ['product-service', 'user-service', 'order-service']
                    for (service in services) {
                        sh "docker build -t ${DOCKER_REGISTRY}/${service}:${env.BUILD_ID} ./services/${service}"
                    }
                    sh "docker build -t ${DOCKER_REGISTRY}/frontend:${env.BUILD_ID} ./frontend"
                }
            }
        }

        stage('Security Scan (Trivy)') {
            steps {
                script {
                    def services = ['product-service', 'user-service', 'order-service', 'frontend']
                    for (service in services) {
                        // Scan image for HIGH and CRITICAL vulnerabilities
                        sh "trivy image --exit-code 0 --severity HIGH,CRITICAL ${DOCKER_REGISTRY}/${service}:${env.BUILD_ID}"
                    }
                }
            }
        }

        stage('Push to Registry') {
            steps {
                script {
                    // Ensure you are logged into ECR beforehand, e.g.:
                    // sh "aws ecr get-login-password --region eu-central-1 | docker login --username AWS --password-stdin ${DOCKER_REGISTRY}"
                    def services = ['product-service', 'user-service', 'order-service', 'frontend']
                    for (service in services) {
                        sh "docker push ${DOCKER_REGISTRY}/${service}:${env.BUILD_ID}"
                    }
                }
            }
        }

        stage('Deploy to Kubernetes') {
            steps {
                script {
                    // Update image tags in manifests and apply
                    sh "sed -i 's/:latest/:${env.BUILD_ID}/g' k8s/*.yaml"
                    sh "kubectl apply -f k8s/"
                }
            }
        }
    }

    post {
        always {
            cleanWs()
        }
        success {
            echo "Pipeline succeeded!"
        }
        failure {
            echo "Pipeline failed!"
        }
    }
}
