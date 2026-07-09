# Handy values printed after `terraform apply`.

output "ec2_public_ip" {
  description = "Public IP of the EC2 instance."
  value       = aws_instance.app.public_ip
}

output "api_url" {
  description = "CloudMart backend API base URL."
  value       = "http://${aws_instance.app.public_ip}:3000"
}

output "health_check" {
  description = "Command to verify the backend is up."
  value       = "curl http://${aws_instance.app.public_ip}:3000/health"
}

output "ssh_command" {
  description = "SSH into the instance (adjust key path to your private key)."
  value       = "ssh ec2-user@${aws_instance.app.public_ip}"
}

output "s3_website_url" {
  description = "Frontend static website URL."
  value       = "http://${aws_s3_bucket_website_configuration.frontend.website_endpoint}"
}
