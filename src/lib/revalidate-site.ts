import 'server-only';
import {revalidatePath,revalidateTag} from 'next/cache';
/** CMS saves must expire the shared bundle, not only the rendered page. */
export function revalidateSiteContent(){
 revalidateTag('site-data',{expire:0});
 revalidateTag('opportunities',{expire:0});
 revalidatePath('/','layout');
}
