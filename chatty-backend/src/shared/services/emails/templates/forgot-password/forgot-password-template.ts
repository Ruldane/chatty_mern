import fs from 'fs';
import ejs from 'ejs';

class ForgotPasswordTemplate {
  public passwordResetTemplate(username: string, resetLink: string): string {
    return ejs.render(fs.readFileSync(__dirname + '/forgot-password-template.ejs', 'utf8'), {
      username,
      resetLink,
      image_url:
        'https://media.istockphoto.com/id/1413841863/fr/photo/serrures-de-porte-et-cl%C3%A9s-antiques-sur-un-fond-ancien-vieux-cadenas-et-cl%C3%A9-d%C3%A9finir-comme-un.jpg?b=1&s=170667a&w=0&k=20&c=MkaqdvMT7bi06WlNCIYxEZp89fM_5-fhDKA4FOvMHag='
    });
  }
}

export const forgotPasswordTemplate: ForgotPasswordTemplate = new ForgotPasswordTemplate();
